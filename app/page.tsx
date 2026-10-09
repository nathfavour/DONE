'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementAccount, AgreementState, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { CreateAgreementDrawer } from '@/components/protocol/CreateAgreementDrawer';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  UploadCloud,
  Coins,
  ArrowRight,
  Droplets,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AGREEMENTS_QUERY_KEY } from '@/hooks/useAgreement';

export default function OverviewPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { requestDevnetUsdcFaucet } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'ready' | 'completed'>('all');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // Quick Action Drawer
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'inspect',
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
  const activeAgreements = agreements.filter(
    (a) => a.state !== AgreementState.COMPLETED && a.state !== AgreementState.CANCELLED
  );

  const totalLocked = agreements.reduce((acc, a) => {
    const released = a.milestones
      .filter((m) => m.state === MilestoneState.RELEASED)
      .reduce((sum, m) => sum + m.amountUsdc, 0);
    return acc + (a.state !== AgreementState.DRAFT ? Math.max(0, a.totalAmountUsdc - released) : 0);
  }, 0);

  const totalSettled = agreements.reduce((acc, a) => {
    return (
      acc +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((sum, m) => sum + m.amountUsdc, 0)
    );
  }, 0);

  const filteredAgreements = agreements.filter((a) => {
    if (activeTab === 'active') return a.state === AgreementState.ACTIVE || a.state === AgreementState.FUNDED;
    if (activeTab === 'ready') return a.milestones.some((m) => m.state === MilestoneState.VERIFIED);
    if (activeTab === 'completed') return a.state === AgreementState.COMPLETED;
    return true;
  });

  return (
    <div className="space-y-6 font-mono text-neutral-100">
      {/* Create Agreement Drawer */}
      <CreateAgreementDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        }}
      />

      {/* Action Drawer */}
      {drawerState.agreement && (
        <QuickActionModal
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          actionType={drawerState.type}
          agreement={drawerState.agreement}
          milestone={drawerState.milestone}
          onExecute={execute}
        />
      )}

      {/* Transaction Status Modal */}
      <TxStateModal
        isOpen={isTxOpen}
        state={txState}
        onClose={() => {
          resetTx();
          queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        }}
      />

      {/* Top Hero Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-5">
        <div className="flex items-center gap-3">
          <DoneLogo className="w-10 h-10" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              DONE Escrow Protocol
            </h1>
            <p className="text-xs text-neutral-400">
              Deterministic milestone settlements on Solana Devnet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000000] hover:bg-neutral-900 border border-[#26262a] text-xs font-semibold text-neutral-300 transition-colors"
          >
            <Droplets className="w-3.5 h-3.5 text-violet-400" />
            +5K USDC
          </button>
          <Button
            variant="primary"
            onClick={() => setIsCreateDrawerOpen(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Create Agreement
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Active Escrows
          </span>
          <div className="text-2xl font-black text-white">
            {activeAgreements.length}
          </div>
        </div>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Total Value Locked
          </span>
          <div className="text-2xl font-black text-violet-400">
            ${formatUsdc(totalLocked)} <span className="text-xs text-neutral-500 font-normal">USDC</span>
          </div>
        </div>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Settled Volume
          </span>
          <div className="text-2xl font-black text-emerald-400">
            ${formatUsdc(totalSettled)} <span className="text-xs text-neutral-500 font-normal">USDC</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center bg-[#000000] border border-[#26262a] p-1 rounded-xl text-xs">
          {[
            { id: 'all', label: `All (${agreements.length})` },
            { id: 'active', label: 'In Progress' },
            { id: 'ready', label: 'Ready to Release' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agreement List or Clean Zero State */}
      {agreements.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-[#000000] border border-[#26262a] rounded-3xl space-y-4">
          <DoneLogo className="w-16 h-16 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No Escrow Agreements Yet</h3>
            <p className="text-xs text-neutral-400">
              Create your first non-custodial milestone escrow agreement on Solana.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsCreateDrawerOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Create Escrow Agreement
            </Button>
          </div>
        </div>
      ) : filteredAgreements.length === 0 ? (
        <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
          No agreements matching this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAgreements.map((agreement) => {
            const nextMilestone =
              agreement.milestones.find((m) => m.state !== MilestoneState.RELEASED) ||
              agreement.milestones[agreement.milestones.length - 1];

            const releasedCount = agreement.milestones.filter(
              (m) => m.state === MilestoneState.RELEASED
            ).length;

            const progressPct =
              agreement.milestones.length > 0
                ? Math.round((releasedCount / agreement.milestones.length) * 100)
                : 0;

            return (
              <div
                key={agreement.publicKey}
                className="p-5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/40 rounded-2xl transition-all space-y-4"
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AgreementStateBadge state={agreement.state} />
                      <Link
                        href={`/agreements/${agreement.publicKey}`}
                        className="text-base font-bold text-white hover:text-violet-300 transition-colors"
                      >
                        {agreement.title}
                      </Link>
                    </div>
                    <div className="text-xs text-neutral-400 flex items-center gap-3">
                      <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                      <span>•</span>
                      <span>Vault: {truncateAddress(agreement.vaultPda, 4)}</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-lg font-black text-violet-400">
                      ${formatUsdc(agreement.totalAmountUsdc)} USDC
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {releasedCount} / {agreement.milestones.length} Milestones Settled ({progressPct}%)
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Milestone Pills & Quick Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#26262a]/60">
                  <div className="flex flex-wrap gap-1.5">
                    {agreement.milestones.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => openDrawer('inspect', agreement, m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                          m.state === MilestoneState.RELEASED
                            ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                            : m.state === MilestoneState.VERIFIED
                            ? 'bg-violet-950/30 text-violet-300 border-violet-500/30 font-bold'
                            : m.state === MilestoneState.EVIDENCE_SUBMITTED
                            ? 'bg-amber-950/30 text-amber-300 border-amber-500/30'
                            : 'bg-[#000000] text-neutral-400 border-[#26262a]'
                        }`}
                      >
                        #{idx + 1}: ${formatUsdc(m.amountUsdc)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Primary contextual action button */}
                    {agreement.state === AgreementState.DRAFT && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('fund', agreement)}
                        className="text-xs"
                      >
                        Fund Escrow
                      </Button>
                    )}

                    {nextMilestone && nextMilestone.state === MilestoneState.PENDING && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDrawer('submit_evidence', agreement, nextMilestone)}
                        className="text-xs"
                      >
                        <UploadCloud className="w-3.5 h-3.5 mr-1 text-violet-400" />
                        Submit Proof
                      </Button>
                    )}

                    {nextMilestone && nextMilestone.state === MilestoneState.EVIDENCE_SUBMITTED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('verify', agreement, nextMilestone)}
                        className="text-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        Verify
                      </Button>
                    )}

                    {nextMilestone && nextMilestone.state === MilestoneState.VERIFIED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('release', agreement, nextMilestone)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500"
                      >
                        <Coins className="w-3.5 h-3.5 mr-1" />
                        Authorize Release
                      </Button>
                    )}

                    <Link
                      href={`/agreements/${agreement.publicKey}`}
                      className="px-3 py-1.5 rounded-xl bg-[#000000] hover:bg-neutral-900 border border-[#26262a] text-neutral-300 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      Details <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
