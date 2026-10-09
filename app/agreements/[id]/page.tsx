'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAgreement } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { AgreementStateBadge, MilestoneStateBadge, VerificationTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import {
  ChevronLeft,
  Lock,
  ExternalLink,
  Coins,
  ShieldCheck,
  UploadCloud,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function AgreementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: agreement, isLoading } = useAgreement(id);
  const { publicKeyString, role, switchRole } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  // Contextual inspection panel state
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'verify',
  });

  const openDrawer = (type: QuickActionType, milestone?: MilestoneAccount) => {
    setDrawerState({
      isOpen: true,
      type,
      milestone,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center font-mono">
        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-neutral-400 text-xs">Deserializing Anchor agreement account...</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center font-mono space-y-4">
        <Card className="space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Agreement Account Not Found</h2>
          <p className="text-xs text-neutral-400">
            No on-chain account matching address {id} was found on Devnet.
          </p>
          <div className="pt-2">
            <Link href="/agreements">
              <Button variant="secondary" size="sm">
                Return to Agreements Catalog
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isSponsor = publicKeyString === agreement.sponsor;
  const isWorker = publicKeyString === agreement.worker;

  const settledAmountUsdc = agreement.milestones
    .filter((m) => m.state === MilestoneState.RELEASED)
    .reduce((sum, m) => sum + m.amountUsdc, 0);

  const percentSettled =
    agreement.totalAmountUsdc > 0
      ? Math.round((settledAmountUsdc / agreement.totalAmountUsdc) * 100)
      : 0;

  return (
    <div className="space-y-6 font-mono text-neutral-100">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      {/* SlideDrawer Contextual Right Sidebar / Bottom Drawer */}
      <QuickActionModal
        isOpen={drawerState.isOpen}
        onClose={closeDrawer}
        actionType={drawerState.type}
        agreement={agreement}
        milestone={drawerState.milestone}
        onExecute={execute}
        onSwitchAction={(nextType, nextM) => {
          setDrawerState((prev) => ({
            ...prev,
            type: nextType,
            milestone: nextM ?? prev.milestone,
          }));
        }}
      />

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/agreements"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>

        {agreement.fundingTx && (
          <a
            href={getExplorerUrl(agreement.fundingTx, 'tx')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Escrow Vault Tx</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* 3.4 Agreement Summary Header */}
      <Card className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{agreement.title}</h1>
              <AgreementStateBadge state={agreement.state} />
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-3xl leading-relaxed">
              {agreement.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#26262a]">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                ESCROW BUDGET
              </span>
              <div className="text-2xl font-bold text-emerald-400">
                ${formatUsdc(agreement.totalAmountUsdc)}{' '}
                <span className="text-xs text-neutral-400 font-normal">USDC</span>
              </div>
            </div>

            {agreement.state === AgreementState.DRAFT && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openDrawer('fund')}
              >
                <Lock className="w-4 h-4 mr-2" />
                Fund Escrow Vault
              </Button>
            )}
          </div>
        </div>

        {/* Progress Track */}
        <div className="space-y-1.5 pt-2 border-t border-[#202024]">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>
              Settlement Disbursed: <span className="text-white font-semibold">{percentSettled}%</span>
            </span>
            <span className="text-emerald-400 font-semibold">
              ${formatUsdc(settledAmountUsdc)} / ${formatUsdc(agreement.totalAmountUsdc)} USDC
            </span>
          </div>
          <div className="w-full h-2 bg-[#141416] rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${percentSettled}%` }}
            />
          </div>
        </div>

        {/* Monospace IDs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">SPONSOR ACCOUNT</span>
            <span className="text-neutral-200 font-mono text-xs">{truncateAddress(agreement.sponsor, 6)}</span>
          </div>
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">WORKER ACCOUNT</span>
            <span className="text-neutral-200 font-mono text-xs">{truncateAddress(agreement.worker, 6)}</span>
          </div>
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">VAULT PDA</span>
            <span className="text-cyan-400 font-mono text-xs">{truncateAddress(agreement.vaultPda, 6)}</span>
          </div>
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">TERMS SHA-256</span>
            <span className="text-neutral-300 font-mono text-xs">{truncateAddress(agreement.termsHash, 6)}</span>
          </div>
        </div>
      </Card>

      {/* 3.4 Milestone Sequential Pipeline: Stacked interactive cards (rounded-2xl, #0d0d0f) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Milestone Sequential Pipeline ({agreement.milestones.length})
          </h2>
          <span className="text-xs text-neutral-400">Click any milestone to open Right Sidebar inspection</span>
        </div>

        <div className="space-y-3">
          {agreement.milestones.map((milestone) => (
            <div
              key={milestone.publicKey}
              className="bg-[#0d0d0f] border border-[#26262a] hover:border-neutral-500 rounded-2xl p-5 transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Index, Title, Status, Criteria */}
                <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => openDrawer('inspect', milestone)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-[#141416] border border-[#202024] text-xs font-bold text-neutral-300">
                      M#{milestone.index}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">{milestone.title}</h3>
                    <MilestoneStateBadge state={milestone.state} />
                    <VerificationTypeBadge type={milestone.verificationType} />
                  </div>

                  <p className="text-xs text-neutral-400">{milestone.description}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400 pt-1">
                    <span>DoD Commit: {truncateAddress(milestone.dodHash, 6)}</span>
                    <span>•</span>
                    <span>{milestone.dodCriteria.length} Verifiable Conditions</span>
                    {milestone.settlementTx && (
                      <>
                        <span>•</span>
                        <a
                          href={getExplorerUrl(milestone.settlementTx, 'tx')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          Tx: {truncateAddress(milestone.settlementTx, 4)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Direct Action Triggers */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-[#202024] gap-3">
                  <div className="text-left lg:text-right">
                    <div className="text-base sm:text-lg font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </div>
                    <span className="text-[10px] text-neutral-500 uppercase">Devnet Escrow</span>
                  </div>

                  {/* Contextual Action Button based on state */}
                  <div className="flex items-center gap-2">
                    {milestone.state === MilestoneState.PENDING && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('submit_evidence', milestone)}
                      >
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                        Submit Evidence
                      </Button>
                    )}

                    {milestone.state === MilestoneState.EVIDENCE_SUBMITTED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('verify', milestone)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        Run Verification
                      </Button>
                    )}

                    {milestone.state === MilestoneState.VERIFIED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('release', milestone)}
                      >
                        <Coins className="w-3.5 h-3.5 mr-1.5" />
                        Release Escrowed USDC
                      </Button>
                    )}

                    {milestone.state === MilestoneState.RELEASED && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDrawer('inspect', milestone)}
                      >
                        View Receipt
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
