'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSponsorAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementAccount, AgreementState, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import {
  ShieldCheck,
  PlusCircle,
  AlertCircle,
  ChevronRight,
  Lock,
  TrendingUp,
} from 'lucide-react';

export default function SponsorDashboardPage() {
  const { publicKeyString, role, switchRole } = useWallet();
  const { data: agreements = [], isLoading } = useSponsorAgreements(publicKeyString);
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'verify',
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

  // Calculate metrics
  const totalEscrowLocked = agreements.reduce((sum, a) => {
    const released = a.milestones
      .filter((m) => m.state === MilestoneState.RELEASED)
      .reduce((s, m) => s + m.amountUsdc, 0);
    return sum + (a.state !== AgreementState.DRAFT ? a.totalAmountUsdc - released : 0);
  }, 0);

  const totalSettledPaid = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  // Milestones requiring sponsor attention (EVIDENCE_SUBMITTED)
  const pendingVerifications = agreements.flatMap((a) =>
    a.milestones
      .filter((m) => m.state === MilestoneState.EVIDENCE_SUBMITTED)
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
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold tracking-wider">CAPITAL SPONSOR</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Sponsor Console</h1>
        </div>

        <div className="flex items-center gap-3">
          {role !== 'sponsor' && (
            <button
              onClick={() => switchRole('sponsor')}
              className="text-xs text-violet-300 hover:text-white px-3 py-1.5 rounded-xl border border-[#26262a] hover:border-violet-500/40 bg-[#141416] transition-colors"
            >
              Switch to Sponsor
            </button>
          )}
          <Link href="/agreements/new">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              New Agreement
            </Button>
          </Link>
        </div>
      </div>

      {/* 3.6 Escrow Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
              LOCKED IN ESCROW
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              ${formatUsdc(totalEscrowLocked)} <span className="text-xs text-neutral-400">USDC</span>
            </div>
            <span className="text-[10px] text-violet-400 mt-0.5 block">Vault PDAs</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Lock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
              TOTAL DISBURSED (SETTLED)
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              ${formatUsdc(totalSettledPaid)} <span className="text-xs text-neutral-400">USDC</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Released upon verified DoD</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141416] border border-[#202024] flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
              PENDING VERIFICATIONS
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {pendingVerifications.length}{' '}
              <span className="text-xs text-neutral-400 font-normal">Milestones</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Awaiting sponsor audit</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#141416] border border-[#202024] flex items-center justify-center text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 3.6 Pending Review Queue (EVIDENCE_SUBMITTED) */}
      {pendingVerifications.length > 0 && (
        <div className="p-5 bg-[#0d0d0f] border border-amber-500/30 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-100">
                PENDING REVIEW QUEUE: DELIVERABLES READY FOR AUDIT ({pendingVerifications.length})
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
              ACTION REQUIRED
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingVerifications.map(({ agreement, milestone }) => (
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
                  onClick={() => openDrawer('verify', agreement, milestone)}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Perform DoD Audit
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Sponsored Agreements */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          Sponsored Agreements ({agreements.length})
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-neutral-400">Loading agreements...</div>
        ) : agreements.length === 0 ? (
          <Card className="py-8 text-center text-xs text-neutral-500 space-y-2">
            <p>No agreements initialized under this sponsor keypair.</p>
            <Link href="/agreements/new">
              <Button variant="primary" size="sm">
                Create First Agreement
              </Button>
            </Link>
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
                    <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
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

                  {agreement.state === AgreementState.DRAFT ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openDrawer('fund', agreement)}
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Fund Escrow
                    </Button>
                  ) : (
                    <Link href={`/agreements/${agreement.publicKey}`}>
                      <Button variant="secondary" size="sm">
                        Console
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
