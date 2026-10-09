'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet, WalletRole } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementAccount, AgreementState, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { AgreementStateBadge, MilestoneStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import {
  Lock,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  UploadCloud,
  Coins,
  RotateCcw,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  Droplets,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AGREEMENTS_QUERY_KEY } from '@/hooks/useAgreement';

export default function OverviewCommandPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { publicKeyString, role, switchRole, usdcBalance, currentSlot, rpcLatencyMs, requestDevnetUsdcFaucet } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();
  const queryClient = useQueryClient();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<'all' | 'needs_funding' | 'needs_evidence' | 'needs_verify' | 'ready_settle'>('all');

  // Contextual inspection and action drawer
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
  const totalEscrowed = agreements.reduce((acc, a) => {
    const released = a.milestones
      .filter((m) => m.state === MilestoneState.RELEASED)
      .reduce((sum, m) => sum + m.amountUsdc, 0);
    return acc + (a.state !== AgreementState.DRAFT ? a.totalAmountUsdc - released : 0);
  }, 0);

  const totalSettled = agreements.reduce((acc, a) => {
    return (
      acc +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((sum, m) => sum + m.amountUsdc, 0)
    );
  }, 0);

  const activeInFlightMilestones = agreements.reduce((acc, a) => {
    return (
      acc +
      a.milestones.filter(
        (m) =>
          m.state === MilestoneState.PENDING ||
          m.state === MilestoneState.EVIDENCE_SUBMITTED ||
          m.state === MilestoneState.VERIFIED
      ).length
    );
  }, 0);

  // Filtered agreements based on state
  const filteredAgreements = agreements.filter((a) => {
    if (activeTab === 'needs_funding') return a.state === AgreementState.DRAFT;
    if (activeTab === 'needs_evidence')
      return a.milestones.some((m) => m.state === MilestoneState.PENDING);
    if (activeTab === 'needs_verify')
      return a.milestones.some((m) => m.state === MilestoneState.EVIDENCE_SUBMITTED);
    if (activeTab === 'ready_settle')
      return a.milestones.some((m) => m.state === MilestoneState.VERIFIED);
    return true;
  });

  // Recent activity ledger
  const recentMilestones = agreements
    .flatMap((a) =>
      a.milestones.map((m) => ({
        agreementId: a.publicKey,
        agreementTitle: a.title,
        workerKey: a.worker,
        milestone: m,
      }))
    )
    .sort((a, b) => (b.milestone.releasedAt || 0) - (a.milestone.releasedAt || 0));

  // Reset Demo State
  const handleResetDemoState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('done_protocol_agreements_v1');
    }
    queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
    window.location.reload();
  };

  return (
    <div className="space-y-5 font-mono text-neutral-100">
      {/* 1. BUTTON-DRIVEN CONTROL HUD */}
      <section className="bg-[#0d0d0f] border border-[#26262a] rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#26262a] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide uppercase">
                  Settlement Console
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px] font-bold">
                  SOLANA DEVNET
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>Balance: <span className="text-emerald-400 font-bold">${formatUsdc(usdcBalance)} USDC</span></span>
                <span>•</span>
                <span>Latency: {rpcLatencyMs}ms</span>
              </div>
            </div>
          </div>

          {/* Quick Role Buttons */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-[#202024] p-1 rounded-xl">
            {(['sponsor', 'worker', 'oracle'] as WalletRole[]).map((r) => {
              const isActive = role === r;
              return (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1a1a1e]'
                  }`}
                >
                  {r === 'oracle' ? 'Verifier' : r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Action Button Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/agreements/new">
              <Button variant="primary" size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Agreement
              </Button>
            </Link>

            <button
              onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-violet-950/40 border border-[#26262a] hover:border-violet-500/40 text-violet-300 text-xs font-medium transition-all"
            >
              <Droplets className="w-3.5 h-3.5 text-violet-400" />
              <span>+5K USDC Faucet</span>
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemoState}
              className="text-neutral-400 hover:text-white border-[#26262a]"
              title="Reset sample agreements"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Demo
            </Button>
          </div>

          <div className="text-[11px] text-neutral-400">
            Slot #{currentSlot.toLocaleString()}
          </div>
        </div>
      </section>

      {/* 2. REAL-TIME PROTOCOL METRICS ROW */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0d0d0f] border border-[#26262a] p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Escrow Locked
          </span>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1">
            ${formatUsdc(totalEscrowed)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </div>
          <span className="text-[10px] text-violet-400 mt-1">Vault PDAs</span>
        </div>

        <div className="bg-[#0d0d0f] border border-[#26262a] p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Settled Payouts
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
            ${formatUsdc(totalSettled)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">Released to Worker ATAs</span>
        </div>

        <div className="bg-[#0d0d0f] border border-[#26262a] p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Active Milestones
          </span>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1">
            {activeInFlightMilestones} <span className="text-xs text-neutral-400 font-normal">In-Flight</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">Evidence & Verification</span>
        </div>

        <div className="bg-[#0d0d0f] border border-[#26262a] p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            RPC Health
          </span>
          <div className="text-xl sm:text-2xl font-bold text-violet-300 mt-1 truncate">
            {rpcLatencyMs}ms
          </div>
          <span className="text-[10px] text-emerald-400 mt-1">Devnet Online</span>
        </div>
      </section>

      {/* 3. ACTIVE AGREEMENTS WORKSPACE */}
      <section className="bg-[#0d0d0f] border border-[#26262a] rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Workspace Bar with Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Active Agreements ({filteredAgreements.length})
            </h2>
          </div>

          {/* Quick Segment Filter Buttons */}
          <div className="flex items-center overflow-x-auto no-scrollbar gap-1 bg-[#141416] p-1 rounded-xl border border-[#202024]">
            {[
              { id: 'all', label: 'All' },
              { id: 'needs_funding', label: 'Needs Funding' },
              { id: 'needs_evidence', label: 'Submit Proof' },
              { id: 'needs_verify', label: 'Verify DoD' },
              { id: 'ready_settle', label: 'Ready Disbursal' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agreement Interactive Cards List */}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-neutral-400">Loading agreements...</div>
        ) : filteredAgreements.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500 space-y-2">
            <p>No agreements match the selected filter.</p>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('all')}>
              Show All
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredAgreements.map((agreement) => {
              const settledAmount = agreement.milestones
                .filter((m) => m.state === MilestoneState.RELEASED)
                .reduce((sum, m) => sum + m.amountUsdc, 0);

              return (
                <div
                  key={agreement.publicKey}
                  className="bg-[#141416] border border-[#202024] hover:border-violet-500/30 rounded-2xl p-4 sm:p-5 transition-all space-y-3.5"
                >
                  {/* Agreement Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202024] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/agreements/${agreement.publicKey}`}
                          className="font-bold text-sm sm:text-base text-white hover:text-violet-300 transition-colors"
                        >
                          {agreement.title}
                        </Link>
                        <AgreementStateBadge state={agreement.state} />
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-neutral-400 font-mono">
                        <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                        <span>•</span>
                        <span>Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="text-right pr-2">
                        <div className="text-sm font-bold text-emerald-400">
                          ${formatUsdc(agreement.totalAmountUsdc)} USDC
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          ${formatUsdc(settledAmount)} Settled
                        </div>
                      </div>

                      {/* Main Action on Agreement Level */}
                      {agreement.state === AgreementState.DRAFT && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openDrawer('fund', agreement)}
                        >
                          <Lock className="w-3.5 h-3.5 mr-1" />
                          Fund Escrow
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDrawer('inspect', agreement)}
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Milestones Pipeline Track */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {agreement.milestones.map((m) => (
                        <div
                          key={m.publicKey}
                          className="bg-[#0d0d0f] border border-[#202024] rounded-xl p-3 flex flex-col justify-between space-y-2 hover:border-violet-500/30 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-neutral-400">#{m.index + 1}</span>
                              <MilestoneStateBadge state={m.state} />
                            </div>
                            <h4 className="text-xs font-semibold text-neutral-200 line-clamp-1">
                              {m.title}
                            </h4>
                            <div className="text-xs font-bold text-emerald-400">
                              ${formatUsdc(m.amountUsdc)} USDC
                            </div>
                          </div>

                          {/* Action Button depending on milestone state */}
                          <div className="pt-2 border-t border-[#1a1a1e]">
                            {m.state === MilestoneState.PENDING && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDrawer('submit_evidence', agreement, m)}
                                className="w-full text-amber-300 border-amber-500/30 hover:bg-amber-500/10 text-[11px] py-1.5"
                              >
                                <UploadCloud className="w-3 h-3 mr-1" />
                                Submit Proof
                              </Button>
                            )}

                            {m.state === MilestoneState.EVIDENCE_SUBMITTED && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openDrawer('verify', agreement, m)}
                                className="w-full text-[11px] py-1.5"
                              >
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Verify DoD
                              </Button>
                            )}

                            {m.state === MilestoneState.VERIFIED && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openDrawer('release', agreement, m)}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[11px] py-1.5"
                              >
                                <Coins className="w-3 h-3 mr-1" />
                                Disburse USDC
                              </Button>
                            )}

                            {m.state === MilestoneState.RELEASED && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openDrawer('inspect', agreement, m)}
                                className="w-full text-neutral-400 text-[11px] py-1.5"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1 text-violet-400" />
                                Settled
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. RECENT VERIFIABLE ACTIVITY LEDGER */}
      <section className="bg-[#0d0d0f] border border-[#26262a] rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Settlements
            </h2>
          </div>
          <Link
            href="/agreements"
            className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            <span>Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentMilestones.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">No settlement events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#202024] text-neutral-400 uppercase text-[10px]">
                  <th className="pb-2.5 font-semibold">Milestone</th>
                  <th className="pb-2.5 font-semibold">Worker</th>
                  <th className="pb-2.5 font-semibold">Amount</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1e]">
                {recentMilestones.slice(0, 5).map(({ agreementId, agreementTitle, workerKey, milestone }) => (
                  <tr key={milestone.publicKey} className="hover:bg-[#141416]/50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/agreements/${agreementId}`}
                        className="font-semibold text-neutral-200 hover:text-violet-300 block truncate max-w-xs"
                      >
                        {milestone.title}
                      </Link>
                      <span className="text-[10px] text-neutral-400 truncate block">
                        {agreementTitle}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-neutral-400">
                      {truncateAddress(workerKey, 4)}
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </td>
                    <td className="py-2.5 pr-3">
                      <MilestoneStateBadge state={milestone.state} />
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      {milestone.settlementTx ? (
                        <a
                          href={getExplorerUrl(milestone.settlementTx, 'tx')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          {truncateAddress(milestone.settlementTx, 4)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Contextual Right Flyout / Bottom Drawer */}
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

      {/* Top Drawer Transaction Execution */}
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />
    </div>
  );
}
