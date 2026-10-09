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
  Sparkles,
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
    fund: 'Fund Escrow Vault',
    submit_evidence: `Submit Proof — Milestone #${milestone?.index ?? 0}`,
    verify: `Verification Audit — Milestone #${milestone?.index ?? 0}`,
    release: `Release Settlement — Milestone #${milestone?.index ?? 0}`,
    inspect: `On-Chain Inspector — ${milestone ? `Milestone #${milestone.index}` : 'Agreement'}`,
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
      <div className="space-y-4 text-xs font-mono">
        {/* INSPECT PROTOCOL RECORD */}
        {actionType === 'inspect' && (
          <div className="space-y-4">
            {/* Status and summary */}
            <div className="p-3.5 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
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
                  <span className="text-neutral-400">VERIFICATION:</span>
                  <span className="text-violet-300 font-semibold uppercase">{milestone.verificationType}</span>
                </div>
              )}
            </div>

            {/* PDAs and Cryptographic Commitments */}
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                On-Chain Accounts & Derived PDAs
              </span>
              <div className="bg-[#000000] border border-[#26262a] rounded-xl p-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Vault PDA:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-violet-300 font-mono">{truncateAddress(agreement.vaultPda, 5)}</span>
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
                    DoD Checklist ({milestone.dodCriteria.length})
                  </span>
                  <span className="text-[10px] text-violet-400 font-mono">
                    SHA-256: {truncateAddress(milestone.dodHash, 4)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {milestone.dodCriteria.map((crit, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#000000] border border-[#26262a] flex items-start gap-2"
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
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Evidence Hash:</span>
                    <span className="text-violet-300 font-mono">{truncateAddress(milestone.evidence.evidenceHash, 6)}</span>
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
                        className="text-violet-400 hover:underline inline-flex items-center gap-1"
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
              <div className="p-3 bg-violet-500/10 border border-violet-500/25 rounded-xl space-y-1.5">
                <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider block">
                  Disbursed & Finalized
                </span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Settlement Tx:</span>
                  <a
                    href={getExplorerUrl(milestone.settlementTx, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-300 hover:underline inline-flex items-center gap-1 font-mono"
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
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
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
            <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">AGREEMENT:</span>
                <span className="font-bold text-neutral-200 truncate max-w-[200px]">{agreement.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">REQUIRED BUDGET:</span>
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
                <span className="text-[11px] block">Need Devnet USDC to fund this escrow?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestDevnetUsdcFaucet(agreement.totalAmountUsdc)}
                  className="w-full text-violet-300 border-violet-500/30 hover:bg-violet-950/30"
                >
                  <Droplets className="w-3.5 h-3.5 mr-1 text-violet-400" />
                  Top Up +${formatUsdc(agreement.totalAmountUsdc)} USDC
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
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
          <div className="space-y-3.5">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[10px]">TARGET MILESTONE:</span>
                <span className="font-semibold text-neutral-200">{milestone.title}</span>
              </div>
              <span className="text-emerald-400 font-bold">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            {/* Quick Proof Buttons */}
            <div className="space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Quick Proof Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeliverableLink('https://github.com/done-protocol/core/pull/88');
                    setMetadataUri('https://arweave.net/tx_contract_audit_report_v1.tar.gz');
                    setEvidenceNotes('Completed and passed 100% tests against committed DoD criteria.');
                  }}
                  className="px-2 py-1 rounded-lg bg-[#000000] hover:bg-violet-900/30 text-[10px] text-neutral-300 hover:text-violet-300 border border-[#26262a]"
                >
                  🐙 PR #88 Merged
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliverableLink('https://github.com/done-protocol/core/commit/9f38a1');
                    setMetadataUri('https://ipfs.io/ipfs/bafybeic7...audit_artifacts');
                    setEvidenceNotes('Slither and Trident invariant test suite executed successfully.');
                  }}
                  className="px-2 py-1 rounded-lg bg-[#000000] hover:bg-violet-900/30 text-[10px] text-neutral-300 hover:text-violet-300 border border-[#26262a]"
                >
                  📦 IPFS Artifacts
                </button>
              </div>
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
              label="EVIDENCE SUMMARY"
              rows={2}
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
            />

            {computedEvidenceHash && (
              <div className="p-2 bg-[#000000] border border-[#26262a] rounded-xl flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Canonical SHA-256:</span>
                <span className="font-mono text-violet-300">
                  {truncateAddress(computedEvidenceHash, 6)}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
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
          <div className="space-y-3.5">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[10px]">AUDITING MILESTONE:</span>
                <span className="font-semibold text-neutral-200">{milestone.title}</span>
              </div>
              <span className="text-emerald-400 font-bold">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 font-semibold text-[11px]">
                  CRITERIA CHECKLIST:
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
                  className="text-[10px] text-violet-300 bg-[#000000] hover:bg-violet-900/40 px-2 py-0.5 rounded-lg border border-violet-500/30 font-bold"
                >
                  ⚡ Pass All (1-Click)
                </button>
              </div>

              {milestone.dodCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className={`p-2.5 border rounded-xl cursor-pointer flex items-center gap-2.5 transition-all ${
                    checkedCriteria[idx]
                      ? 'bg-[#000000] border-violet-500/60 text-neutral-100 shadow-sm'
                      : 'bg-[#000000] border-[#26262a] text-neutral-400 hover:border-[#383840]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      checkedCriteria[idx]
                        ? 'bg-violet-600 text-white'
                        : 'border border-[#26262a]'
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

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
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
            <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">DISBURSAL AMOUNT:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ${formatUsdc(milestone.amountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">RECIPIENT:</span>
                <span className="font-mono text-neutral-300">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="flex justify-between border-t border-[#26262a] pt-2">
                <span className="text-neutral-400">VERIFICATION:</span>
                <span className="text-emerald-400 font-bold uppercase">Criteria Passed ✓</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRelease}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
              >
                Release ${formatUsdc(milestone.amountUsdc)} USDC
              </Button>
            </div>
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}
