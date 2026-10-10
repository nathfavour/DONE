import '@/lib/polyfills';
import * as anchor from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';
import idl from './idl/done_protocol.json';
import {
  DEVNET_RPC_URL,
  DEVNET_USDC_MINT,
  DONE_PROGRAM_ID,
  PROTOCOL_CONFIG_PDA,
} from '../solana';
import {
  getAgreementPda,
  getMilestonePda,
  getEscrowAuthorityPda,
  getEscrowTokenAccountPda,
} from './pda';
import {
  AgreementAccount,
  MilestoneAccount,
  AgreementState,
  MilestoneState,
  VerificationType,
} from '@/types/protocol';

export function getAnchorProgram(
  connection: Connection,
  walletPublicKey?: PublicKey,
  signTransaction?: (tx: Transaction) => Promise<Transaction>,
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>
) {
  const wallet: anchor.Wallet = {
    publicKey: walletPublicKey || PublicKey.default,
    signTransaction: (signTransaction ? (tx: any) => signTransaction(tx) : async (tx: any) => tx) as any,
    signAllTransactions: (signAllTransactions ? (txs: any) => signAllTransactions(txs) : async (txs: any) => txs) as any,
    payer: {} as any,
  };

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });

  return new anchor.Program(idl as anchor.Idl, provider);
}

/**
 * Fetch all on-chain agreements and their milestones directly from Solana Devnet RPC
 */
export async function fetchAllOnChainAgreements(): Promise<AgreementAccount[]> {
  try {
    const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
    const program = getAnchorProgram(connection);

    // Fetch all agreement accounts owned by DONE Program on Devnet
    const rawAgreements = await (program.account as any).agreement.all();
    if (!rawAgreements || rawAgreements.length === 0) {
      return [];
    }

    const agreements: AgreementAccount[] = [];

    for (const item of rawAgreements) {
      const pubkey: PublicKey = item.publicKey;
      const acc = item.account;

      // Determine agreement state enum
      let stateEnum = AgreementState.DRAFT;
      if (acc.status) {
        if ('draft' in acc.status) stateEnum = AgreementState.DRAFT;
        else if ('funded' in acc.status) stateEnum = AgreementState.FUNDED;
        else if ('active' in acc.status) stateEnum = AgreementState.ACTIVE;
        else if ('completed' in acc.status) stateEnum = AgreementState.COMPLETED;
        else if ('cancelled' in acc.status) stateEnum = AgreementState.CANCELLED;
      }

      // Fetch corresponding milestones for this agreement PDA
      const rawMilestones = await (program.account as any).milestone.all([
        {
          memcmp: {
            offset: 8, // anchor account discriminator length
            bytes: pubkey.toBase58(),
          },
        },
      ]);

      const milestones: MilestoneAccount[] = (rawMilestones || [])
        .sort((a: any, b: any) => a.account.index - b.account.index)
        .map((m: any) => {
          const mAcc = m.account;
          let mState = MilestoneState.PENDING;
          if (mAcc.status) {
            if ('pending' in mAcc.status) mState = MilestoneState.PENDING;
            else if ('evidenceSubmitted' in mAcc.status) mState = MilestoneState.EVIDENCE_SUBMITTED;
            else if ('verified' in mAcc.status) mState = MilestoneState.VERIFIED;
            else if ('released' in mAcc.status) mState = MilestoneState.RELEASED;
          }

          const defHashHex = Buffer.from(mAcc.definitionHash || []).toString('hex');
          const evHashHex = Buffer.from(mAcc.evidenceHash || []).toString('hex');

          return {
            publicKey: m.publicKey.toBase58(),
            agreement: pubkey.toBase58(),
            index: mAcc.index,
            title: `Milestone #${mAcc.index + 1}`,
            description: `On-chain Milestone #${mAcc.index + 1}`,
            amountUsdc: Number(mAcc.amount.toString()),
            dodCriteria: ['Solana on-chain verifiable commitment recipe'],
            dodHash: defHashHex,
            verifier: mAcc.verifier.toBase58(),
            verificationType: VerificationType.ON_CHAIN_ORACLE,
            state: mState,
            evidence: mAcc.evidenceSubmitted
              ? {
                  metadataUri: '',
                  notes: 'Evidence submitted on-chain',
                  deliverableLinks: [],
                  submittedAt: Date.now(),
                  submittedBy: acc.worker.toBase58(),
                  evidenceHash: evHashHex,
                }
              : undefined,
            settlementTx: mAcc.releasedAmount > 0 ? undefined : undefined,
          };
        });

      const [escrowTokenAccount] = getEscrowTokenAccountPda(pubkey);
      const defHashHex = Buffer.from(acc.definitionHash || []).toString('hex');

      agreements.push({
        publicKey: pubkey.toBase58(),
        sponsor: acc.sponsor.toBase58(),
        worker: acc.worker.toBase58(),
        title: `Protocol Agreement #${acc.agreementId ? acc.agreementId.toString() : pubkey.toBase58().slice(0, 6)}`,
        description: 'Settled under DONE Protocol Program on Solana Devnet.',
        termsText: 'Settled under DONE Protocol Program on Solana Devnet.',
        termsHash: defHashHex,
        totalAmountUsdc: Number(acc.totalAmount.toString()),
        state: stateEnum,
        milestoneCount: acc.milestoneCount || milestones.length,
        createdAt: Date.now() - 3600000,
        vaultPda: escrowTokenAccount.toBase58(),
        bump: acc.bump || 255,
        milestones,
        workerAccepted: Boolean(acc.workerAccepted),
        agreementId: acc.agreementId ? acc.agreementId.toString() : undefined,
        isOnChain: true,
      });
    }

    return agreements;
  } catch (err) {
    console.warn('Failed to fetch on-chain agreements from Devnet:', err);
    return [];
  }
}

/**
 * Executes on-chain agreement creation on Solana Devnet
 */
export async function executeOnChainCreateAgreement(
  sponsor: PublicKey,
  worker: PublicKey,
  totalAmountUsdc: number,
  definitionHash32: Uint8Array,
  milestonesData: Array<{
    amountUsdc: number;
    definitionHash32: Uint8Array;
    verifier: PublicKey;
  }>,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<{ signature: string; agreementPda: string }> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, sponsor, walletSigner.signTransaction);

  const agreementId = new BN(Date.now());
  const [agreementPda] = getAgreementPda(sponsor, agreementId);
  const amountBn = new BN(totalAmountUsdc);

  const tx = new Transaction();

  // 1. Create Agreement Instruction
  const createIx = await (program.methods as any)
    .createAgreement(agreementId, amountBn, Array.from(definitionHash32))
    .accounts({
      sponsor,
      worker,
      paymentMint: DEVNET_USDC_MINT,
      config: PROTOCOL_CONFIG_PDA,
      agreement: agreementPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  tx.add(createIx);

  // 2. Create Sequential Milestones
  for (let i = 0; i < milestonesData.length; i++) {
    const m = milestonesData[i];
    const [milestonePda] = getMilestonePda(agreementPda, i);
    const mAmountBn = new BN(m.amountUsdc);

    const milestoneIx = await (program.methods as any)
      .createMilestone(
        i,
        mAmountBn,
        Array.from(m.definitionHash32),
        m.verifier
      )
      .accounts({
        sponsor,
        agreement: agreementPda,
        milestone: milestonePda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(milestoneIx);
  }

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = sponsor;

  const signedTx = await walletSigner.signTransaction(tx);
  const rawTx = signedTx.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return { signature, agreementPda: agreementPda.toBase58() };
}

/**
 * Worker accepts the finalized allocation on-chain
 */
export async function executeOnChainAcceptAgreement(
  worker: PublicKey,
  agreementPda: PublicKey,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, worker, walletSigner.signTransaction);

  const tx = new Transaction();
  const acceptIx = await (program.methods as any)
    .acceptAgreement()
    .accounts({
      worker,
      agreement: agreementPda,
    })
    .instruction();

  tx.add(acceptIx);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = worker;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Sponsor funds the escrow in USDC on-chain
 */
export async function executeOnChainFundAgreement(
  sponsor: PublicKey,
  agreementPda: PublicKey,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, sponsor, walletSigner.signTransaction);

  const [escrowAuthority] = getEscrowAuthorityPda(agreementPda);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(agreementPda);

  const sponsorTokenAccount = await getAssociatedTokenAddress(
    DEVNET_USDC_MINT,
    sponsor,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction();

  // Verify or create sponsor token account
  const info = await connection.getAccountInfo(sponsorTokenAccount);
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        sponsor,
        sponsorTokenAccount,
        sponsor,
        DEVNET_USDC_MINT,
        TOKEN_PROGRAM_ID
      )
    );
  }

  const fundIx = await (program.methods as any)
    .fundAgreement()
    .accounts({
      sponsor,
      agreement: agreementPda,
      paymentMint: DEVNET_USDC_MINT,
      sponsorTokenAccount,
      escrowAuthority,
      escrowTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  tx.add(fundIx);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = sponsor;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Worker submits 32-byte evidence hash on-chain
 */
export async function executeOnChainSubmitEvidence(
  worker: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  evidenceHash32: Uint8Array,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, worker, walletSigner.signTransaction);

  const tx = new Transaction();
  const submitIx = await (program.methods as any)
    .submitEvidence(Array.from(evidenceHash32))
    .accounts({
      worker,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .instruction();

  tx.add(submitIx);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = worker;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Designated verifier verifies submitted evidence on-chain
 */
export async function executeOnChainVerifyEvidence(
  verifier: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, verifier, walletSigner.signTransaction);

  const tx = new Transaction();
  const verifyIx = await (program.methods as any)
    .verifyEvidence()
    .accounts({
      verifier,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .instruction();

  tx.add(verifyIx);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = verifier;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Designated verifier rejects submitted evidence on-chain
 */
export async function executeOnChainRejectEvidence(
  verifier: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  rejectionReasonHash32: Uint8Array,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, verifier, walletSigner.signTransaction);

  const tx = new Transaction();
  const rejectIx = await (program.methods as any)
    .rejectEvidence(Array.from(rejectionReasonHash32))
    .accounts({
      verifier,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .instruction();

  tx.add(rejectIx);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = verifier;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Release verified milestone payment from Escrow PDA to worker token account
 */
export async function executeOnChainReleaseMilestone(
  payer: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  workerPubkey: PublicKey,
  walletSigner: {
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, payer, walletSigner.signTransaction);

  const [escrowAuthority] = getEscrowAuthorityPda(agreementPda);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(agreementPda);

  const workerTokenAccount = await getAssociatedTokenAddress(
    DEVNET_USDC_MINT,
    workerPubkey,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction();

  // Create worker ATA if it doesn't exist yet
  const info = await connection.getAccountInfo(workerTokenAccount);
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer,
        workerTokenAccount,
        workerPubkey,
        DEVNET_USDC_MINT,
        TOKEN_PROGRAM_ID
      )
    );
  }

  const releaseIx = await (program.methods as any)
    .releaseMilestone()
    .accounts({
      agreement: agreementPda,
      milestone: milestonePda,
      paymentMint: DEVNET_USDC_MINT,
      escrowAuthority,
      escrowTokenAccount,
      workerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  tx.add(releaseIx);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}
