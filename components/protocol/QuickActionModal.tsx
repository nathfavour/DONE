'use client';

import React, { useState, useEffect } from 'react';
import { AgreementAccount, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { hashEvidencePayload, uint8ArrayToHex } from '@/lib/protocol/hashing';
import { useWallet } from '../web3/WalletContext';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { PublicKey } from '@solana/web3.js';
import {
  Lock,
  UploadCloud,
  ShieldCheck,
  Coins,
  CheckCircle2,
  ExternalLink,
  X,
  Droplets,
  AlertCircle,
  Hash,
} from 'lucide-react';

export type QuickActionType = 'fund' | 'submit_evidence' | 'verify' | 'release';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: QuickActionType;
  agreement: AgreementAccount;
  milestone?: MilestoneAccount;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<any>
  ) => Promise<any>;
}

export function QuickActionModal({
  isOpen,
  onClose,
  actionType,
  agreement,
  milestone,
  onExecute,
}: QuickActionModalProps) {
  const { usdcBalance, deductUsdc, creditUsdc, requestDevnetUsdcFaucet } = useWallet();

  // Evidence state
  const [metadataUri, setMetadataUri] = useState('https://arweave.net/tx_verifiable_work_artifact_v1.tar.gz');
  const [evidenceNotes, setEvidenceNotes] = useState('Completed implementation and verified 100% test coverage against DoD requirements.');
  const [deliverableLink, setDeliverableLink] = useState('https://github.com/done-protocol/core/pull/88');
  const [computedEvidenceHash, setComputedEvidenceHash] = useState('');

  // Verification state
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState('Verified code quality, invariant tests, and Arweave artifacts match DoD.');

  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute evidence hash when input changes
  useEffect(() => {
    let active = true;
    if (actionType === 'submit_evidence') {
      hashEvidencePayload({
        metadataUri,
        notes: evidenceNotes,
        deliverableLinks: [deliverableLink].filter(Boolean),
      }).then((buf) => {
        if (active) setComputedEvidenceHash(uint8ArrayToHex(buf));
      });
    }
    return () => {
      active = false;
    };
  }, [actionType, metadataUri, evidenceNotes, deliverableLink]);

  if (!isOpen) return null;

  // 1. FUND ESCROW
  const handleFund = async () => {
    setIsProcessing(true);
    try {
      await onExecute(
        'fundAgreement',
        `Locking ${formatUsdc(agreement.totalAmountUsdc)} USDC into Vault PDA (${truncateAddress(agreement.vaultPda, 4)})`,
        async () => {
          const res = await protocolClient.fundAgreement({
            agreement: new PublicKey(agreement.publicKey),
            amount: agreement.totalAmountUsdc,
          });
          deductUsdc(agreement.totalAmountUsdc);
          return res;
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. SUBMIT EVIDENCE
  const handleSubmitEvidence = async () => {
    if (!milestone) return;
    setIsProcessing(true);
    try {
      const hashBuf = await hashEvidencePayload({
        metadataUri,
        notes: evidenceNotes,
        deliverableLinks: [deliverableLink].filter(Boolean),
      });

      await onExecute(
        'submitEvidence',
        `Worker logging evidence proof for Milestone #${milestone.index} (${truncateAddress(computedEvidenceHash, 6)})`,
        async () => {
          return protocolClient.submitEvidence({
            agreement: new PublicKey(agreement.publicKey),
            milestoneIndex: milestone.index,
            evidenceHash: hashBuf,
            metadataUri,
            notes: evidenceNotes,
            deliverableLinks: [deliverableLink].filter(Boolean),
          });
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. VERIFY DoD
  const handleVerify = async () => {
    if (!milestone) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'verifyMilestone',
        `Verifier signing off Milestone #${milestone.index} Definition of Done fulfillment`,
        async () => {
          return protocolClient.verifyMilestone({
            agreement: new PublicKey(agreement.publicKey),
            milestoneIndex: milestone.index,
            notes: verificationNotes,
          });
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. RELEASE PAYMENT
  const handleRelease = async () => {
    if (!milestone) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'releasePayment',
        `Disbursing ${formatUsdc(milestone.amountUsdc)} USDC from Escrow Vault to Worker ATA`,
        async () => {
          const res = await protocolClient.releasePayment({
            agreement: new PublicKey(agreement.publicKey),
            milestoneIndex: milestone.index,
          });
          creditUsdc(milestone.amountUsdc);
          return res;
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            {actionType === 'fund' && <Lock className="w-4 h-4 text-cyan-400" />}
            {actionType === 'submit_evidence' && <UploadCloud className="w-4 h-4 text-amber-400" />}
            {actionType === 'verify' && <ShieldCheck className="w-4 h-4 text-cyan-400" />}
            {actionType === 'release' && <Coins className="w-4 h-4 text-emerald-400" />}
            <span className="font-bold text-xs uppercase tracking-wider text-zinc-100">
              {actionType === 'fund' && 'Fund Protocol Escrow Vault'}
              {actionType === 'submit_evidence' && 'Submit Deliverable Evidence'}
              {actionType === 'verify' && 'Perform Verification Audit'}
              {actionType === 'release' && 'Release USDC Settlement'}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body based on action */}
        {actionType === 'fund' && (
          <div className="space-y-4 text-xs">
            <p className="text-zinc-400">
              Lock required milestone budget from your wallet into the program&apos;s Escrow Vault PDA.
            </p>
            <div className="p-3 bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">AGREEMENT:</span>
                <span className="font-bold text-zinc-200 truncate max-w-[200px]">{agreement.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">TOTAL REQUIRED:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${formatUsdc(agreement.totalAmountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">YOUR WALLET:</span>
                <span className="text-zinc-300">${formatUsdc(usdcBalance)} USDC</span>
              </div>
            </div>

            {usdcBalance < agreement.totalAmountUsdc && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800 text-amber-300 space-y-2">
                <span className="text-[11px] block">Need more Devnet USDC to fund this escrow?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestDevnetUsdcFaucet(agreement.totalAmountUsdc)}
                  className="w-full text-cyan-300 border-cyan-800"
                >
                  <Droplets className="w-3.5 h-3.5 mr-1" />
                  Top Up +${formatUsdc(agreement.totalAmountUsdc)} USDC
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFund}
                disabled={usdcBalance < agreement.totalAmountUsdc || isProcessing}
                isLoading={isProcessing}
              >
                Deposit & Lock Funds
              </Button>
            </div>
          </div>
        )}

        {actionType === 'submit_evidence' && milestone && (
          <div className="space-y-4 text-xs">
            <div className="p-2.5 bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">TARGET CRITERIA:</span>
              <ul className="mt-1 space-y-1 text-zinc-300">
                {milestone.dodCriteria.map((c, i) => (
                  <li key={i} className="flex gap-1.5 items-start">
                    <span className="text-cyan-400">✓</span> {c}
                  </li>
                ))}
              </ul>
            </div>

            <Input
              label="ARTIFACT / METADATA URI (ARWEAVE / IPFS)"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
              required
            />

            <Input
              label="CODE / PR VERIFICATION LINK"
              value={deliverableLink}
              onChange={(e) => setDeliverableLink(e.target.value)}
              required
            />

            <Textarea
              label="EXECUTION & COMPLIANCE NOTES"
              rows={2}
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              required
            />

            <div className="p-2.5 bg-zinc-900 border border-zinc-800 text-[11px]">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">
                CANONICAL SHA-256 EVIDENCE COMMITMENT:
              </span>
              <span className="text-amber-300 font-mono break-all">{computedEvidenceHash}</span>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitEvidence}
                disabled={isProcessing || !metadataUri.trim()}
                isLoading={isProcessing}
              >
                Log Evidence on Solana
              </Button>
            </div>
          </div>
        )}

        {actionType === 'verify' && milestone && (
          <div className="space-y-4 text-xs">
            <p className="text-zinc-400">
              Audit the submitted artifacts against each committed Definition of Done requirement:
            </p>

            {milestone.evidence && (
              <div className="p-2.5 bg-zinc-900 border border-zinc-800 text-[11px] space-y-1">
                <span className="text-zinc-400 block uppercase font-bold">SUBMITTED ARTIFACT:</span>
                <a
                  href={milestone.evidence.metadataUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                >
                  {milestone.evidence.metadataUri} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-300 uppercase">DoD Criteria Checklist:</span>
              {milestone.dodCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className={`p-2 border cursor-pointer flex items-center gap-2 ${
                    checkedCriteria[idx]
                      ? 'bg-zinc-900 border-cyan-400 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 border flex items-center justify-center ${
                      checkedCriteria[idx] ? 'bg-cyan-400 border-cyan-400 text-black' : 'border-zinc-700'
                    }`}
                  >
                    {checkedCriteria[idx] && '✓'}
                  </div>
                  <span className="text-xs">{crit}</span>
                </div>
              ))}
            </div>

            <Textarea
              label="AUDIT SIGN-OFF NOTES"
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
            />

            <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleVerify}
                disabled={isProcessing || !milestone.dodCriteria.every((_, i) => checkedCriteria[i])}
                isLoading={isProcessing}
              >
                Sign Verification on Block
              </Button>
            </div>
          </div>
        )}

        {actionType === 'release' && milestone && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">DISBURSAL AMOUNT:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ${formatUsdc(milestone.amountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">RECIPIENT WORKER:</span>
                <span className="font-mono text-zinc-300">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">STATUS:</span>
                <span className="text-cyan-400 font-bold uppercase">Criteria Verified ✓</span>
              </div>
            </div>

            <p className="text-zinc-400 text-[11px]">
              Executing this instruction calls the Escrow Vault PDA to transfer ${formatUsdc(milestone.amountUsdc)} USDC directly into the worker&apos;s token account.
            </p>

            <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRelease}
                disabled={isProcessing}
                isLoading={isProcessing}
              >
                Disburse ${formatUsdc(milestone.amountUsdc)} USDC
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
