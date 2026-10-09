'use client';

import React, { useState, useEffect } from 'react';
import { AgreementAccount, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { hashEvidencePayload, uint8ArrayToHex } from '@/lib/protocol/hashing';
import { useWallet } from '../web3/WalletContext';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { SlideDrawer } from '../ui/SlideDrawer';
import { PublicKey } from '@solana/web3.js';
import {
  Lock,
  UploadCloud,
  ShieldCheck,
  Coins,
  ExternalLink,
  Droplets,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Hash,
  Copy,
  Check,
} from 'lucide-react';
import { MilestoneStateBadge } from '../ui/Badge';

export type QuickActionType = 'fund' | 'submit_evidence' | 'verify' | 'release' | 'inspect';

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
  onSwitchAction?: (type: QuickActionType, milestone?: MilestoneAccount) => void;
}

export function QuickActionModal({
  isOpen,
  onClose,
  actionType,
  agreement,
  milestone,
  onExecute,
  onSwitchAction,
}: QuickActionModalProps) {
  const { usdcBalance, deductUsdc, creditUsdc, requestDevnetUsdcFaucet } = useWallet();

  // Evidence state
  const [metadataUri, setMetadataUri] = useState('https://arweave.net/tx_verifiable_work_artifact_v1.tar.gz');
  const [evidenceNotes, setEvidenceNotes] = useState('Completed implementation and verified 100% test coverage against committed DoD.');
  const [deliverableLink, setDeliverableLink] = useState('https://github.com/done-protocol/core/pull/88');
  const [computedEvidenceHash, setComputedEvidenceHash] = useState('');

  // Verification state
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState('Audited criteria against committed canonical DoD SHA-256 hash.');

  // Loading & copy state
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1500);
  };

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

  // 3. VERIFY CRITERIA
  const handleVerify = async () => {
    if (!milestone) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'verifyMilestone',
        `Sponsor auditing & finalizing verification for Milestone #${milestone.index}`,
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

  // 4. RELEASE SETTLEMENT
  const handleRelease = async () => {
    if (!milestone) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'releaseSettlement',
        `Disbursing ${formatUsdc(milestone.amountUsdc)} USDC from Vault PDA to Worker ATA (${truncateAddress(agreement.worker, 4)})`,
        async () => {
          const res = await protocolClient.releaseSettlement({
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

  const titles: Record<QuickActionType, string> = {
    fund: 'Fund Protocol Escrow Vault',
    submit_evidence: `Submit Evidence — Milestone #${milestone?.index ?? 0}`,
    verify: `Verification Audit — Milestone #${milestone?.index ?? 0}`,
    release: `Release Settlement — Milestone #${milestone?.index ?? 0}`,
    inspect: `On-Chain Inspector — ${milestone ? `Milestone #${milestone.index}` : 'Agreement Account'}`,
  };

  const subtitles: Record<QuickActionType, string> = {
    fund: agreement.title,
    submit_evidence: milestone?.title ?? agreement.title,
    verify: milestone?.title ?? agreement.title,
    release: `$${formatUsdc(milestone?.amountUsdc ?? 0)} USDC to Worker ATA`,
    inspect: milestone?.title ?? agreement.title,
  };

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={titles[actionType]}
      subtitle={subtitles[actionType]}
    >
      <div className="space-y-5 text-xs font-mono">
        {/* INSPECT PROTOCOL RECORD */}
        {actionType === 'inspect' && (
          <div className="space-y-4">
            {/* Status and summary */}
            <div className="p-3.5 bg-[#141416] border border-[#202024] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">STATE:</span>
                {milestone ? (
                  <MilestoneStateBadge state={milestone.state} />
                ) : (
                  <span className="font-bold text-neutral-200">{agreement.state}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">ALLOCATED BUDGET:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  ${formatUsdc(milestone ? milestone.amountUsdc : agreement.totalAmountUsdc)} USDC
                </span>
              </div>
              {milestone && (
                <div className="flex items-center justify-between border-t border-[#26262a] pt-2">
                  <span className="text-neutral-400">VERIFICATION TYPE:</span>
                  <span className="text-neutral-300 font-semibold uppercase">{milestone.verificationType}</span>
                </div>
              )}
            </div>

            {/* PDAs and Cryptographic Commitments */}
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                On-Chain Accounts & Derived PDAs
              </span>
              <div className="bg-[#141416] border border-[#202024] rounded-xl p-3 space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Vault PDA:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-300 font-mono">{truncateAddress(agreement.vaultPda, 5)}</span>
                    <button
                      onClick={() => copyText(agreement.vaultPda, 'vault')}
                      className="text-neutral-400 hover:text-white"
                    >
                      {copiedKey === 'vault' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Agreement PDA:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-300 font-mono">{truncateAddress(agreement.publicKey, 5)}</span>
                    <button
                      onClick={() => copyText(agreement.publicKey, 'agree')}
                      className="text-neutral-400 hover:text-white"
                    >
                      {copiedKey === 'agree' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {milestone && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Milestone PDA:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-300 font-mono">{truncateAddress(milestone.publicKey, 5)}</span>
                      <button
                        onClick={() => copyText(milestone.publicKey, 'mPda')}
                        className="text-neutral-400 hover:text-white"
                      >
                        {copiedKey === 'mPda' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Definition of Done Breakdown */}
            {milestone && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Definition of Done (DoD) Criteria
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    SHA-256: {truncateAddress(milestone.dodHash, 4)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {milestone.dodCriteria.map((crit, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#141416] border border-[#202024] flex items-start gap-2.5"
                    >
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-neutral-300 text-[11px] leading-relaxed">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Payload details if present */}
            {milestone?.evidence && (
              <div className="space-y-2">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                  Submitted Evidence Record
                </span>
                <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Evidence Hash:</span>
                    <span className="text-cyan-300 font-mono">{truncateAddress(milestone.evidence.evidenceHash, 6)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block mb-0.5">Worker Notes:</span>
                    <p className="text-neutral-300 italic">{milestone.evidence.notes}</p>
                  </div>
                  {milestone.evidence.metadataUri && (
                    <div className="pt-1">
                      <a
                        href={milestone.evidence.metadataUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Arweave Artifact</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settlement transaction details if released */}
            {milestone?.settlementTx && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Disbursed & Finalized
                </span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Settlement Signature:</span>
                  <a
                    href={getExplorerUrl(milestone.settlementTx, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    {truncateAddress(milestone.settlementTx, 5)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Next Action trigger inside inspection drawer */}
            {onSwitchAction && milestone && (
              <div className="pt-3 border-t border-[#26262a]">
                {milestone.state === MilestoneState.PENDING && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => onSwitchAction('submit_evidence', milestone)}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Proceed to Submit Evidence
                  </Button>
                )}
                {milestone.state === MilestoneState.EVIDENCE_SUBMITTED && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => onSwitchAction('verify', milestone)}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Proceed to Verification Audit
                  </Button>
                )}
                {milestone.state === MilestoneState.VERIFIED && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => onSwitchAction('release', milestone)}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Proceed to Disburse Escrow
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* FUND ESCROW */}
        {actionType === 'fund' && (
          <div className="space-y-4">
            <p className="text-neutral-400">
              Lock required milestone budget from your wallet into the program&apos;s Escrow Vault PDA.
            </p>
            <div className="p-4 bg-[#141416] border border-[#202024] rounded-xl space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">AGREEMENT:</span>
                <span className="font-bold text-neutral-200 truncate max-w-[200px]">{agreement.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">TOTAL REQUIRED:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${formatUsdc(agreement.totalAmountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between border-t border-[#26262a] pt-2">
                <span className="text-neutral-400">YOUR WALLET:</span>
                <span className="text-neutral-300">${formatUsdc(usdcBalance)} USDC</span>
              </div>
            </div>

            {usdcBalance < agreement.totalAmountUsdc && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-2">
                <span className="text-[11px] block">Need more Devnet USDC to fund this escrow?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestDevnetUsdcFaucet(agreement.totalAmountUsdc)}
                  className="w-full text-cyan-300 border-[#26262a]"
                >
                  <Droplets className="w-3.5 h-3.5 mr-1" />
                  Top Up +${formatUsdc(agreement.totalAmountUsdc)} USDC
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-[#26262a] flex justify-end gap-2">
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

        {/* SUBMIT EVIDENCE */}
        {actionType === 'submit_evidence' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl text-[11px] space-y-1">
              <span className="text-neutral-400">TARGET MILESTONE:</span>
              <p className="font-semibold text-neutral-200">{milestone.title}</p>
              <span className="text-emerald-400 font-bold block mt-1">
                Amount: ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            <Input
              label="DELIVERABLE REPOSITORY / PR LINK"
              value={deliverableLink}
              onChange={(e) => setDeliverableLink(e.target.value)}
              placeholder="https://github.com/org/repo/pull/12"
            />

            <Input
              label="ARWEAVE / IPFS ARTIFACT URI"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
              placeholder="https://arweave.net/tx_hash"
            />

            <Textarea
              label="EVIDENCE SUMMARY & NOTES"
              rows={3}
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Describe work completed against criteria..."
            />

            <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase">Live Canonical Evidence SHA-256:</span>
              <p className="font-mono text-[11px] text-cyan-300 truncate">
                {computedEvidenceHash || 'Calculating pre-image hash...'}
              </p>
            </div>

            <div className="pt-4 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitEvidence}
                disabled={isProcessing || !computedEvidenceHash}
                isLoading={isProcessing}
              >
                Submit Proof to Chain
              </Button>
            </div>
          </div>
        )}

        {/* VERIFICATION ENGINE */}
        {actionType === 'verify' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl space-y-1 text-[11px]">
              <span className="text-neutral-400">TARGET MILESTONE:</span>
              <p className="font-semibold text-neutral-200">{milestone.title}</p>
              {milestone.evidence && (
                <div className="mt-1 pt-1 border-t border-[#26262a]">
                  <span className="text-neutral-400">Worker Evidence Hash: </span>
                  <span className="text-cyan-300 font-mono">
                    {truncateAddress(milestone.evidence.evidenceHash, 6)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-semibold text-[11px]">
                  AUDIT DEFINITION OF DONE CHECKLIST:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<number, boolean> = {};
                    milestone.dodCriteria.forEach((_, i) => {
                      all[i] = true;
                    });
                    setCheckedCriteria(all);
                  }}
                  className="text-[10px] text-cyan-300 bg-[#141416] px-2 py-0.5 rounded-lg border border-[#26262a]"
                >
                  ⚡ Check All Criteria
                </button>
              </div>
              {milestone.dodCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className={`p-2.5 border rounded-xl cursor-pointer flex items-center gap-2.5 transition-colors ${
                    checkedCriteria[idx]
                      ? 'bg-[#141416] border-emerald-500/50 text-neutral-100'
                      : 'bg-[#0d0d0f] border-[#26262a] text-neutral-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                      checkedCriteria[idx] ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-[#26262a]'
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

            <div className="pt-4 border-t border-[#26262a] flex justify-end gap-2">
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

        {/* RELEASE SETTLEMENT */}
        {actionType === 'release' && milestone && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141416] border border-[#202024] rounded-xl space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">DISBURSAL AMOUNT:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ${formatUsdc(milestone.amountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">RECIPIENT WORKER:</span>
                <span className="font-mono text-neutral-300">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="flex justify-between border-t border-[#26262a] pt-2">
                <span className="text-neutral-400">STATUS:</span>
                <span className="text-emerald-400 font-bold uppercase">Criteria Verified ✓</span>
              </div>
            </div>

            <p className="text-neutral-400 text-[11px]">
              Executing this instruction calls the Escrow Vault PDA to transfer ${formatUsdc(milestone.amountUsdc)} USDC directly into the worker&apos;s token account.
            </p>

            <div className="pt-4 border-t border-[#26262a] flex justify-end gap-2">
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
    </SlideDrawer>
  );
}
