'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements, AGREEMENTS_QUERY_KEY } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { AgreementState, MilestoneState, AgreementAccount, MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import { CreateAgreementDrawer } from '@/components/protocol/CreateAgreementDrawer';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileCode,
  PlusCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  Coins,
} from 'lucide-react';

export default function AgreementsExplorerPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { publicKeyString } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

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

  const filterOptions = [
    { id: 'all', label: `All (${agreements.length})` },
    { id: 'active', label: 'Active Escrows' },
    { id: 'completed', label: 'Completed' },
  ];

  const filteredAgreements = agreements.filter((a) => {
    if (activeFilter === 'active' && (a.state === AgreementState.COMPLETED || a.state === AgreementState.CANCELLED)) return false;
    if (activeFilter === 'completed' && a.state !== AgreementState.COMPLETED) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.publicKey.toLowerCase().includes(q) ||
        a.worker.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-mono text-neutral-100">
      <CreateAgreementDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        }}
      />

      {drawerState.agreement && (
        <QuickActionModal
          isOpen={drawerState.isOpen}
          onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
          actionType={drawerState.type}
          agreement={drawerState.agreement}
          milestone={drawerState.milestone}
          onExecute={execute}
        />
      )}

      <TxStateModal
        isOpen={isTxOpen}
        state={txState}
        onClose={() => {
          resetTx();
          queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2 text-xs text-violet-400 mb-0.5">
              <FileCode className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">ESCROW REGISTRY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Agreements</h1>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create Agreement
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-[#000000] border border-[#26262a] p-1 rounded-xl">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === opt.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title or address..."
            className="w-full sm:w-64 bg-[#000000] border border-[#26262a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* List */}
      {agreements.length === 0 ? (
        <div className="p-10 text-center bg-[#000000] border border-[#26262a] rounded-3xl space-y-4">
          <DoneLogo className="w-14 h-14 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Escrow Agreements</h3>
            <p className="text-xs text-neutral-400">
              Create a milestone agreement with cryptographic proof & deterministic payouts.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreateDrawerOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Create Agreement
          </Button>
        </div>
      ) : filteredAgreements.length === 0 ? (
        <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
          No agreements matching this search.
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
                className="p-5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/40 rounded-2xl transition-all space-y-3"
              >
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
                      <span>{agreement.milestones.length} Milestones</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-lg font-black text-violet-400">
                      ${formatUsdc(agreement.totalAmountUsdc)} USDC
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {releasedCount} / {agreement.milestones.length} Settled
                    </div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

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
