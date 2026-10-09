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
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import {
  Briefcase,
  Coins,
  UploadCloud,
  ChevronRight,
} from 'lucide-react';

export default function WorkerDashboardPage() {
  const { publicKeyString, role, switchRole } = useWallet();
  const { data: agreements = [], isLoading } = useWorkerAgreements(publicKeyString);
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'submit_evidence',
    agreement: null,
  });

  const openAction = (
    type: QuickActionType,
    agreement: AgreementAccount,
    milestone?: MilestoneAccount
  ) => {
    setModalState({
      isOpen: true,
      type,
      agreement,
      milestone,
    });
  };

  const closeAction = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-mono text-zinc-100">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      {modalState.agreement && (
        <QuickActionModal
          isOpen={modalState.isOpen}
          onClose={closeAction}
          actionType={modalState.type}
          agreement={modalState.agreement}
          milestone={modalState.milestone}
          onExecute={execute}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>BUILDER & WORKER PORTFOLIO</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Worker Deliverables Console</h1>
        </div>

        <div className="flex items-center gap-3">
          {role !== 'worker' && (
            <button
              onClick={() => switchRole('worker')}
              className="text-xs text-amber-400 hover:underline px-2.5 py-1 border border-amber-800 bg-amber-950/40"
            >
              Switch Role to Worker
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            SETTLED EARNINGS (PAID)
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ${formatUsdc(totalSettledEarnings)} <span className="text-xs text-zinc-400">USDC</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Transferred to your SPL ATA</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            CLAIMABLE UNLOCKED
          </span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            ${formatUsdc(totalClaimableEarnings)} <span className="text-xs text-zinc-400">USDC</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Verified & ready for release</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            PENDING DELIVERABLES
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {pendingDeliverables.length}{' '}
            <span className="text-xs text-zinc-400 font-normal">Milestones</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Require evidence submission</span>
        </div>
      </div>

      {/* Action Required: Claimable Milestones */}
      {verifiedReadyToRelease.length > 0 && (
        <Card className="border-cyan-800 bg-zinc-950">
          <CardHeader className="bg-cyan-950/40 border-cyan-900/60">
            <div className="flex items-center gap-2 text-cyan-400">
              <Coins className="w-4 h-4" />
              <h3 className="font-bold text-sm tracking-wider uppercase">
                UNLOCKED FOR DISBURSAL ({verifiedReadyToRelease.length})
              </h3>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono">READY TO RELEASE</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {verifiedReadyToRelease.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">{milestone.title}</span>
                    <span className="text-emerald-400 font-bold">${formatUsdc(milestone.amountUsdc)} USDC</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Agreement: {agreement.title}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openAction('release', agreement, milestone)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400"
                >
                  <Coins className="w-3.5 h-3.5 mr-1 text-black" />
                  Release ${formatUsdc(milestone.amountUsdc)} USDC
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* In Progress: Deliverables needing evidence */}
      {pendingDeliverables.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="bg-zinc-900/60">
            <div className="flex items-center gap-2 text-amber-400">
              <UploadCloud className="w-4 h-4" />
              <h3 className="font-bold text-sm tracking-wider uppercase text-zinc-200">
                ACTIVE DELIVERABLES REQUIRING EVIDENCE PROOF ({pendingDeliverables.length})
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">IN PROGRESS</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDeliverables.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">{milestone.title}</span>
                    <span className="text-emerald-400 font-bold">${formatUsdc(milestone.amountUsdc)} USDC</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">Agreement: {agreement.title}</p>
                  <span className="text-[10px] text-zinc-500 block">
                    Criteria count: {milestone.dodCriteria.length} items to fulfill
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openAction('submit_evidence', agreement, milestone)}
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1 text-black" />
                  Submit Evidence
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Assigned Agreements */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
          Assigned Agreements ({agreements.length})
        </h2>

        {isLoading ? (
          <div className="p-6 text-center text-xs text-zinc-400">Loading assignments...</div>
        ) : agreements.length === 0 ? (
          <div className="p-6 text-center border border-zinc-800 bg-zinc-950 text-xs text-zinc-400">
            No agreements currently assigned to this worker keypair.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {agreements.map((agreement) => (
              <div
                key={agreement.publicKey}
                className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200 text-sm">{agreement.title}</span>
                    <AgreementStateBadge state={agreement.state} />
                  </div>
                  <p className="text-zinc-400 text-[11px] line-clamp-1">{agreement.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                    <span>Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                    <span>•</span>
                    <span>Milestones: {agreement.milestones.length}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 block">
                      ${formatUsdc(agreement.totalAmountUsdc)} USDC
                    </span>
                    <span className="text-[10px] text-zinc-400">Total Budget</span>
                  </div>

                  <Link href={`/agreements/${agreement.publicKey}`}>
                    <Button variant="secondary" size="sm">
                      Console
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
