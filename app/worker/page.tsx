'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWorkerAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementAccount, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import {
  Briefcase,
  Coins,
  UploadCloud,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';

export default function WorkerDashboardPage() {
  const { publicKeyString, role, switchRole } = useWallet();
  const { data: agreements = [], isLoading } = useWorkerAgreements(publicKeyString);
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'submit_evidence',
    agreement: null,
  });

  const openDrawer = (
    type: QuickActionType,
    agreement: AgreementAccount,
    milestone?: MilestoneAccount
  ) => {
    setDrawerState({
      isOpen: true,
      type,
      agreement,
      milestone,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  // Metrics
  const totalSettledEarnings = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const totalClaimableEarnings = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.VERIFIED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const pendingDeliverables = agreements.flatMap((a) =>
    a.milestones
      .filter((m) => m.state === MilestoneState.PENDING)
      .map((m) => ({ agreement: a, milestone: m }))
  );

  const verifiedReadyToRelease = agreements.flatMap((a) =>
    a.milestones
      .filter((m) => m.state === MilestoneState.VERIFIED)
      .map((m) => ({ agreement: a, milestone: m }))
  );

  return (
    <div className="space-y-6 font-mono text-neutral-100">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      {drawerState.agreement && (
        <QuickActionModal
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          actionType={drawerState.type}
          agreement={drawerState.agreement}
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
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-violet-400 mb-1">
            <Briefcase className="w-4 h-4" />
            <span className="font-bold tracking-wider">BUILDER STATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Worker Deliverables</h1>
        </div>

        <div className="flex items-center gap-3">
          {role !== 'worker' && (
            <button
              onClick={() => switchRole('worker')}
              className="text-xs text-amber-300 hover:text-white px-3 py-1.5 rounded-xl border border-[#26262a] hover:border-amber-500/40 bg-[#141416] transition-colors"
            >
              Switch to Worker
            </button>
          )}
        </div>
      </div>

      {/* 3.7 Earnings Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
              SETTLED EARNINGS
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              ${formatUsdc(totalSettledEarnings)} <span className="text-xs text-neutral-400">USDC</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Disbursed to Token ATA</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141416] border border-[#202024] flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
              CLAIMABLE UNLOCKED
            </span>
            <div className="text-2xl font-bold text-violet-300 mt-1">
              ${formatUsdc(totalClaimableEarnings)} <span className="text-xs text-neutral-400">USDC</span>
            </div>
            <span className="text-[10px] text-violet-400 mt-0.5 block">Verified & Ready to Release</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Coins className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
              PENDING DELIVERABLES
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {pendingDeliverables.length}{' '}
              <span className="text-xs text-neutral-400 font-normal">Milestones</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Require evidence submission</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141416] border border-[#202024] flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Actionable Unlocked Settlements */}
      {verifiedReadyToRelease.length > 0 && (
        <div className="p-5 bg-[#0d0d0f] border border-violet-500/30 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
            <div className="flex items-center gap-2 text-violet-400">
              <Coins className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-100">
                UNLOCKED FOR DISBURSAL ({verifiedReadyToRelease.length})
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-bold">
              READY TO CLAIM
            </span>
          </div>

          <div className="space-y-2.5">
            {verifiedReadyToRelease.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3.5 bg-[#141416] border border-[#202024] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{milestone.title}</span>
                    <span className="text-emerald-400 font-bold">${formatUsdc(milestone.amountUsdc)} USDC</span>
                  </div>
                  <p className="text-neutral-400 text-[11px] mt-0.5">Agreement: {agreement.title}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openDrawer('release', agreement, milestone)}
                >
                  <Coins className="w-3.5 h-3.5 mr-1.5" />
                  Release ${formatUsdc(milestone.amountUsdc)} USDC
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3.7 Actionable Milestones List (PENDING needing evidence) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          Actionable Milestones ({pendingDeliverables.length})
        </h2>

        {pendingDeliverables.length === 0 ? (
          <Card className="py-8 text-center text-xs text-neutral-500">
            No active deliverables currently requiring evidence.
          </Card>
        ) : (
          <div className="space-y-2.5">
            {pendingDeliverables.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-4 bg-[#0d0d0f] border border-[#26262a] hover:border-neutral-500 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{milestone.title}</span>
                    <span className="text-emerald-400 font-bold">${formatUsdc(milestone.amountUsdc)} USDC</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">Agreement: {agreement.title}</p>
                  <span className="text-[10px] text-neutral-500 block">
                    Criteria count: {milestone.dodCriteria.length} items to fulfill
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openDrawer('submit_evidence', agreement, milestone)}
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                  Submit Evidence
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Agreements */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          All Assigned Agreements ({agreements.length})
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-neutral-400">Loading assignments...</div>
        ) : agreements.length === 0 ? (
          <Card className="py-8 text-center text-xs text-neutral-500">
            No agreements currently assigned to this worker keypair.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {agreements.map((agreement) => (
              <div
                key={agreement.publicKey}
                className="p-5 bg-[#0d0d0f] border border-[#26262a] hover:border-neutral-500 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-sm">{agreement.title}</span>
                    <AgreementStateBadge state={agreement.state} />
                  </div>
                  <p className="text-neutral-400 text-[11px] line-clamp-1">{agreement.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 pt-1 font-mono">
                    <span>Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                    <span>•</span>
                    <span>Milestones: {agreement.milestones.length}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#202024]">
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 block">
                      ${formatUsdc(agreement.totalAmountUsdc)} USDC
                    </span>
                    <span className="text-[10px] text-neutral-500">Total Budget</span>
                  </div>

                  <Link href={`/agreements/${agreement.publicKey}`}>
                    <Button variant="secondary" size="sm">
                      Inspect
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
