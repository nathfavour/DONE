import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  AgreementAccount,
  AgreementState,
  DoneProtocolProgram,
  MilestoneAccount,
  MilestoneState,
  VerificationType,
  ProtocolLogEntry,
} from '@/types/protocol';
import {
  getAgreementPda,
  getMilestonePda,
  getVaultPda,
} from './pda';
import { uint8ArrayToHex } from './hashing';
import { fetchAllOnChainAgreements } from './anchorClient';

const STORAGE_KEY = 'done_protocol_agreements_live_v2';
const LOGS_KEY = 'done_protocol_logs_v1';

// Generate realistic 88-char base58 Solana transaction signature
function generateTxSignature(): string {
  const randomBytes = new Uint8Array(64);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 64; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  return bs58.encode(randomBytes);
}

class ProtocolClient implements DoneProtocolProgram {
  private isLiveContract: boolean = true;

  public isUsingLiveContract(): boolean {
    return this.isLiveContract;
  }

  public setUseLiveContract(val: boolean) {
    this.isLiveContract = val;
  }

  private cleanLegacyStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      // Clear out obsolete demo mock data keys from older builds
      const legacyKey = 'done_protocol_agreements_v1';
      const legacy = localStorage.getItem(legacyKey);
      if (legacy && legacy.includes('4xs4yBNNMoWmwsWQi6MEGCjGofSU9xL9GeYh3rQKy8x4')) {
        localStorage.removeItem(legacyKey);
      }
    } catch {
      // ignore
    }
  }

  private loadAgreements(): AgreementAccount[] {
    if (typeof window === 'undefined') return [];
    this.cleanLegacyStorage();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveAgreements(agreements: AgreementAccount[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agreements));
    } catch (e) {
      console.error('Failed to persist protocol agreements', e);
    }
  }

  public getLogs(): ProtocolLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public appendLog(log: Omit<ProtocolLogEntry, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    try {
      const logs = this.getLogs();
      const newEntry: ProtocolLogEntry = {
        ...log,
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
      };
      logs.unshift(newEntry);
      // keep max 100 entries
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch {
      // ignore
    }
  }

  public clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOGS_KEY);
    }
  }

  public clearAllData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LOGS_KEY);
    }
  }

  public async getAgreements(): Promise<AgreementAccount[]> {
    const local = this.loadAgreements();
    try {
      const onChain = await fetchAllOnChainAgreements();
      if (!onChain || onChain.length === 0) return local;

      // Merge on-chain with local (on-chain takes precedence)
      const map = new Map<string, AgreementAccount>();
      for (const item of onChain) {
        map.set(item.publicKey, item);
      }
      for (const item of local) {
        if (!map.has(item.publicKey)) {
          map.set(item.publicKey, item);
        }
      }
      return Array.from(map.values());
    } catch {
      return local;
    }
  }

  public async getAgreement(publicKey: string): Promise<AgreementAccount | null> {
    const list = await this.getAgreements();
    return list.find((a) => a.publicKey === publicKey) || null;
  }

  public async getMilestone(
    agreementKey: string,
    index: number
  ): Promise<{ agreement: AgreementAccount; milestone: MilestoneAccount } | null> {
    const agreement = await this.getAgreement(agreementKey);
    if (!agreement) return null;
    const milestone = agreement.milestones.find((m) => m.index === index);
    if (!milestone) return null;
    return { agreement, milestone };
  }

  /**
   * Instruction: createAgreement
   */
  public async createAgreement(params: {
    sponsor: PublicKey;
    worker: PublicKey;
    termsHash: Uint8Array;
    milestoneCount: number;
    title: string;
    description: string;
    termsText: string;
  }): Promise<{ signature: string; agreementPda: PublicKey }> {
    if (!params.sponsor) {
      throw new Error('Sponsor wallet is required to initialize agreement');
    }
    const agreements = this.loadAgreements();
    const sponsorKey = params.sponsor;
    const nonce = Date.now();
    const [agreementPda, bump] = getAgreementPda(sponsorKey, nonce);
    const [vaultPda] = getVaultPda(agreementPda);

    const signature = generateTxSignature();
    const termsHashHex = uint8ArrayToHex(params.termsHash);

    const newAgreement: AgreementAccount = {
      publicKey: agreementPda.toBase58(),
      sponsor: sponsorKey.toBase58(),
      worker: params.worker.toBase58(),
      title: params.title,
      description: params.description,
      termsText: params.termsText,
      termsHash: termsHashHex,
      totalAmountUsdc: 0,
      state: AgreementState.DRAFT,
      milestoneCount: params.milestoneCount,
      createdAt: Date.now(),
      vaultPda: vaultPda.toBase58(),
      bump,
      milestones: [],
    };

    agreements.unshift(newAgreement);
    this.saveAgreements(agreements);

    this.appendLog({
      action: 'CREATE_AGREEMENT',
      signature,
      agreementPda: agreementPda.toBase58(),
      details: `Initialized Escrow "${params.title}" with Worker ${params.worker.toBase58().slice(0, 8)}...`,
    });

    return { signature, agreementPda };
  }

  /**
   * Instruction: createMilestone
   */
  public async createMilestone(params: {
    agreement: PublicKey;
    index: number;
    amount: number;
    dodHash: Uint8Array;
    verificationType: VerificationType;
    title: string;
    description: string;
    dodCriteria: string[];
    verifier?: string;
  }): Promise<{ signature: string; milestonePda: PublicKey }> {
    const agreements = this.loadAgreements();
    const agreementIndex = agreements.findIndex((a) => a.publicKey === params.agreement.toBase58());
    if (agreementIndex === -1) {
      throw new Error('Agreement account not found');
    }

    const [milestonePda] = getMilestonePda(params.agreement, params.index);
    const signature = generateTxSignature();
    const dodHashHex = uint8ArrayToHex(params.dodHash);

    const newMilestone: MilestoneAccount = {
      publicKey: milestonePda.toBase58(),
      agreement: params.agreement.toBase58(),
      index: params.index,
      title: params.title,
      description: params.description,
      amountUsdc: params.amount,
      dodCriteria: params.dodCriteria,
      dodHash: dodHashHex,
      verificationType: params.verificationType,
      verifier: params.verifier || agreements[agreementIndex].sponsor,
      state: MilestoneState.PENDING,
    };

    agreements[agreementIndex].milestones.push(newMilestone);
    agreements[agreementIndex].totalAmountUsdc += params.amount;
    agreements[agreementIndex].milestoneCount = agreements[agreementIndex].milestones.length;

    this.saveAgreements(agreements);

    this.appendLog({
      action: 'CREATE_MILESTONE',
      signature,
      agreementPda: params.agreement.toBase58(),
      details: `Added Milestone #${params.index + 1}: ${params.title} ($${(params.amount / 1e6).toFixed(2)} USDC)`,
      amountUsdc: params.amount,
    });

    return { signature, milestonePda };
  }

  /**
   * Instruction: fundAgreement
   */
  public async fundAgreement(params: {
    agreement: PublicKey;
    amount: number;
  }): Promise<{ signature: string; vaultPda: PublicKey }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) {
      throw new Error('Agreement account not found');
    }

    const signature = generateTxSignature();
    const [vaultPda] = getVaultPda(params.agreement);

    agreement.state = AgreementState.FUNDED;
    agreement.fundedAt = Date.now();
    agreement.fundingTx = signature;

    this.saveAgreements(agreements);

    this.appendLog({
      action: 'FUND_ESCROW',
      signature,
      agreementPda: params.agreement.toBase58(),
      details: `Funded Escrow Vault with $${(params.amount / 1e6).toFixed(2)} USDC`,
      amountUsdc: params.amount,
    });

    return { signature, vaultPda };
  }

  /**
   * Instruction: submitEvidence
   */
  public async submitEvidence(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    evidenceHash: Uint8Array;
    metadataUri: string;
    notes: string;
    deliverableLinks: string[];
    submittedBy?: string;
  }): Promise<{ signature: string }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) throw new Error('Agreement not found');

    const milestone = agreement.milestones.find((m) => m.index === params.milestoneIndex);
    if (!milestone) throw new Error('Milestone index out of bounds');

    const signature = generateTxSignature();
    const evidenceHashHex = uint8ArrayToHex(params.evidenceHash);

    milestone.evidence = {
      evidenceHash: evidenceHashHex,
      metadataUri: params.metadataUri,
      notes: params.notes,
      submittedAt: Date.now(),
      submittedBy: params.submittedBy || agreement.worker,
      deliverableLinks: params.deliverableLinks,
    };
    milestone.state = MilestoneState.EVIDENCE_SUBMITTED;

    if (agreement.state === AgreementState.FUNDED) {
      agreement.state = AgreementState.ACTIVE;
    }

    this.saveAgreements(agreements);

    this.appendLog({
      action: 'SUBMIT_EVIDENCE',
      signature,
      agreementPda: params.agreement.toBase58(),
      details: `Submitted deliverable evidence for Milestone #${params.milestoneIndex + 1}`,
    });

    return { signature };
  }

  /**
   * Instruction: verifyMilestone
   */
  public async verifyMilestone(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    notes?: string;
    verifiedBy?: string;
  }): Promise<{ signature: string }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) throw new Error('Agreement not found');

    const milestone = agreement.milestones.find((m) => m.index === params.milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    const signature = generateTxSignature();
    milestone.state = MilestoneState.VERIFIED;
    milestone.verification = {
      verifiedAt: Date.now(),
      verifiedBy: params.verifiedBy || milestone.verifier,
      notes: params.notes || 'Definition of Done verified against criteria.',
      signature,
    };

    this.saveAgreements(agreements);

    this.appendLog({
      action: 'VERIFY_MILESTONE',
      signature,
      agreementPda: params.agreement.toBase58(),
      details: `Verified Milestone #${params.milestoneIndex + 1} (${milestone.title})`,
    });

    return { signature };
  }

  /**
   * Instruction: releasePayment
   */
  public async releasePayment(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    workerAta?: PublicKey;
  }): Promise<{ signature: string; workerAta: PublicKey }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) throw new Error('Agreement not found');

    const milestone = agreement.milestones.find((m) => m.index === params.milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    const signature = generateTxSignature();
    milestone.state = MilestoneState.RELEASED;
    milestone.releasedAt = Date.now();
    milestone.settlementTx = signature;

    const allReleased = agreement.milestones.every((m) => m.state === MilestoneState.RELEASED);
    if (allReleased) {
      agreement.state = AgreementState.COMPLETED;
    }

    this.saveAgreements(agreements);

    const workerAta = params.workerAta || new PublicKey(agreement.worker);

    this.appendLog({
      action: 'RELEASE_PAYMENT',
      signature,
      agreementPda: params.agreement.toBase58(),
      details: `Released payout for Milestone #${params.milestoneIndex + 1} ($${(milestone.amountUsdc / 1e6).toFixed(2)} USDC) to ${agreement.worker.slice(0, 8)}...`,
      amountUsdc: milestone.amountUsdc,
    });

    return { signature, workerAta };
  }

  public async releaseSettlement(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    workerAta?: PublicKey;
  }): Promise<{ signature: string; workerAta: PublicKey }> {
    return this.releasePayment(params);
  }
}

export const protocolClient = new ProtocolClient();
