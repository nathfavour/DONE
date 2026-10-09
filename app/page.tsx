'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementAccount, AgreementState, MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { useQueryClient } from '@tanstack/react-query';
import { MilestoneStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  PlusCircle,
  Coins,
  ShieldCheck,
  UploadCloud,
  FileCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Play,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function AppWorkspacePage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { publicKeyString, role, switchRole, usdcBalance, requestDevnetUsdcFaucet } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Quick Action Modal state
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
  const totalVaultTvl = agreements.reduce((acc, a) => {
    const released = a.milestones
      .filter((m) => m.state === MilestoneState.RELEASED)
      .reduce((s, m) => s + m.amountUsdc, 0);
    return acc + (a.state !== AgreementState.DRAFT ? a.totalAmountUsdc - released : 0);
  }, 0);

  const totalSettledUsdc = agreements.reduce((acc, a) => {
    return (
      acc +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((sum, m) => sum + m.amountUsdc, 0)
    );
  }, 0);

  // Gather all milestones flattened with parent agreement for the Kanban pipeline
  const allMilestoneItems = agreements.flatMap((a) =>
    a.milestones.map((m) => ({
      agreement: a,
      milestone: m,
    }))
  );

  const filteredItems = allMilestoneItems.filter(({ agreement, milestone }) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      agreement.title.toLowerCase().includes(q) ||
      milestone.title.toLowerCase().includes(q) ||
      agreement.publicKey.toLowerCase().includes(q)
    );
  });

  // Kanban Columns
  const colPending = filteredItems.filter(({ milestone }) => milestone.state === MilestoneState.PENDING);
  const colEvidence = filteredItems.filter(
    ({ milestone }) => milestone.state === MilestoneState.EVIDENCE_SUBMITTED
  );
  const colVerified = filteredItems.filter(({ milestone }) => milestone.state === MilestoneState.VERIFIED);
  const colReleased = filteredItems.filter(({ milestone }) => milestone.state === MilestoneState.RELEASED);

  const handleResetSandbox = async () => {
    setIsResetting(true);
    protocolClient.resetToDefaultSeed();
    await queryClient.invalidateQueries();
    setTimeout(() => setIsResetting(false), 400);
  };

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

      {/* Top Application Bar: Metrics & Fast Action Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              ESCROW VAULTS TVL
            </span>
            <div className="text-lg sm:text-xl font-bold text-cyan-400 mt-0.5">
              ${formatUsdc(totalVaultTvl)} <span className="text-xs text-zinc-400">USDC</span>
            </div>
          </div>
          <Lock className="w-5 h-5 text-cyan-500/60" />
        </div>

        <div className="p-3.5 bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              DISBURSED & SETTLED
            </span>
            <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">
              ${formatUsdc(totalSettledUsdc)} <span className="text-xs text-zinc-400">USDC</span>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500/60" />
        </div>

        <div className="p-3.5 bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              ACTIVE MILESTONES
            </span>
            <div className="text-lg sm:text-xl font-bold text-zinc-100 mt-0.5">
              {colPending.length + colEvidence.length + colVerified.length}{' '}
              <span className="text-xs text-zinc-400 font-normal">in flight</span>
            </div>
          </div>
          <Cpu className="w-5 h-5 text-zinc-500" />
        </div>

        <div className="p-3.5 bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
              YOUR DEVNET WALLET
            </span>
            <div className="text-lg sm:text-xl font-bold text-emerald-300 mt-0.5">
              ${formatUsdc(usdcBalance)} <span className="text-xs text-zinc-400">USDC</span>
            </div>
          </div>
          <button
            onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
            title="Airdrop +5K USDC"
            className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-cyan-300 px-2 py-1 border border-zinc-700"
          >
            +5K FAUCET
          </button>
        </div>
      </div>

      {/* Interactive 1-Click Demo Scenarios Strip */}
      <div className="p-4 bg-zinc-950 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.08)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Live Demo Sandbox Actions
            </span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-400 px-1.5 py-0.5">
              Click any scenario to execute live on Devnet
            </span>
          </div>

          <button
            onClick={handleResetSandbox}
            disabled={isResetting}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Sample Data
          </button>
        </div>

        {/* 3 Instant Demo Scenario Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          {/* Scenario 1: Worker Submits Evidence */}
          <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/60 transition-colors flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <UploadCloud className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Worker: Submit Evidence</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Audit: Remediation Verification
              </p>
            </div>
            {colPending[0] && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  switchRole('worker');
                  openAction('submit_evidence', colPending[0].agreement, colPending[0].milestone);
                }}
                className="flex-shrink-0 text-[11px] py-1 px-2.5"
              >
                Test Submit
              </Button>
            )}
          </div>

          {/* Scenario 2: Verifier Signs Audit */}
          <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/60 transition-colors flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Auditor: Verify Criteria</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Geyser Ingestion ($4,500 USDC)
              </p>
            </div>
            {colEvidence[0] && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  switchRole('sponsor');
                  openAction('verify', colEvidence[0].agreement, colEvidence[0].milestone);
                }}
                className="flex-shrink-0 text-[11px] py-1 px-2.5"
              >
                Test Audit
              </Button>
            )}
          </div>

          {/* Scenario 3: Release Payment */}
          <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/60 transition-colors flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <Coins className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Settle: Disburse USDC</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Fuzz Testing ($6,000 USDC)
              </p>
            </div>
            {colVerified[0] && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  switchRole('sponsor');
                  openAction('release', colVerified[0].agreement, colVerified[0].milestone);
                }}
                className="flex-shrink-0 text-[11px] py-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400"
              >
                Release USDC
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Header with Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm sm:text-base font-bold text-zinc-100">
            Live Settlement Pipeline Board ({allMilestoneItems.length} Milestones)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agreement, title, or address..."
            className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 rounded-none focus:outline-none focus:border-cyan-400 w-full sm:w-64"
          />
          <Link href="/agreements/new">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-black" />
              New Agreement
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Stage Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: DoD Committed / In Progress */}
        <div className="space-y-3">
          <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span className="text-xs font-bold text-zinc-200 uppercase">1. In Execution</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono px-1.5 bg-zinc-950 border border-zinc-800">
              {colPending.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {colPending.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-800 text-zinc-500 text-xs">
                No milestones in progress
              </div>
            ) : (
              colPending.map(({ agreement, milestone }) => (
                <div
                  key={milestone.publicKey}
                  className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950/80 px-1.5 py-0.5 border border-cyan-800">
                      M#{milestone.index}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                      {milestone.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {agreement.title}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>{milestone.dodCriteria.length} DoD Criteria</span>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-[10px] py-1 px-2"
                      onClick={() => openAction('submit_evidence', agreement, milestone)}
                    >
                      <UploadCloud className="w-3 h-3 mr-1 text-black" />
                      Submit Proof
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Evidence Submitted (Needs Audit) */}
        <div className="space-y-3">
          <div className="p-2.5 bg-zinc-900/90 border border-amber-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-300 uppercase">2. Evidence Review</span>
            </div>
            <span className="text-[11px] text-amber-300 font-mono px-1.5 bg-amber-950 border border-amber-800">
              {colEvidence.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {colEvidence.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-800 text-zinc-500 text-xs">
                No deliverables awaiting review
              </div>
            ) : (
              colEvidence.map(({ agreement, milestone }) => (
                <div
                  key={milestone.publicKey}
                  className="p-3 bg-zinc-950 border border-amber-900/60 hover:border-amber-700 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950 px-1.5 py-0.5 border border-amber-800">
                      M#{milestone.index}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                      {milestone.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {agreement.title}
                    </p>
                  </div>

                  {milestone.evidence && (
                    <div className="text-[10px] text-cyan-300 truncate font-mono bg-zinc-900 p-1 border border-zinc-800">
                      Proof: {truncateAddress(milestone.evidence.metadataUri, 12)}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-amber-400">Audit Ready</span>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-[10px] py-1 px-2"
                      onClick={() => openAction('verify', agreement, milestone)}
                    >
                      <ShieldCheck className="w-3 h-3 mr-1 text-black" />
                      Verify DoD
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Verified (Ready for Settlement Release) */}
        <div className="space-y-3">
          <div className="p-2.5 bg-zinc-900/90 border border-cyan-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold text-cyan-300 uppercase">3. Settlement Unlocked</span>
            </div>
            <span className="text-[11px] text-cyan-300 font-mono px-1.5 bg-cyan-950 border border-cyan-800">
              {colVerified.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {colVerified.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-800 text-zinc-500 text-xs">
                No verified funds awaiting release
              </div>
            ) : (
              colVerified.map(({ agreement, milestone }) => (
                <div
                  key={milestone.publicKey}
                  className="p-3 bg-zinc-950 border border-cyan-900/70 hover:border-cyan-600 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950 px-1.5 py-0.5 border border-cyan-800">
                      M#{milestone.index}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                      {milestone.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {agreement.title}
                    </p>
                  </div>

                  <div className="text-[10px] text-emerald-400 bg-emerald-950/40 p-1 border border-emerald-900/60">
                    Criteria Verified ✓ Vault Unlocked
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Claimable</span>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-[10px] py-1 px-2 bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400"
                      onClick={() => openAction('release', agreement, milestone)}
                    >
                      <Coins className="w-3 h-3 mr-1 text-black" />
                      Release USDC
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 4: Settled & Released */}
        <div className="space-y-3">
          <div className="p-2.5 bg-zinc-900/90 border border-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 uppercase">4. Settled (Terminal)</span>
            </div>
            <span className="text-[11px] text-emerald-300 font-mono px-1.5 bg-emerald-950 border border-emerald-800">
              {colReleased.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {colReleased.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-zinc-800 text-zinc-500 text-xs">
                No finalized settlements yet
              </div>
            ) : (
              colReleased.map(({ agreement, milestone }) => (
                <div
                  key={milestone.publicKey}
                  className="p-3 bg-zinc-950 border border-emerald-900/40 hover:border-emerald-800 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950 px-1.5 py-0.5 border border-emerald-800">
                      M#{milestone.index}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 leading-snug">
                      {milestone.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {agreement.title}
                    </p>
                  </div>

                  {milestone.settlementTx && (
                    <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
                      <span>Tx:</span>
                      <a
                        href={getExplorerUrl(milestone.settlementTx, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-0.5 font-mono"
                      >
                        {truncateAddress(milestone.settlementTx, 4)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400">Finalized On-Chain</span>
                    <Link
                      href={`/agreements/${agreement.publicKey}/m/${milestone.index}`}
                      className="text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Audit Trail <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Agreements Directory Drawer / List */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            All On-Chain Agreements ({agreements.length})
          </h3>
          <span className="text-[10px] text-zinc-500">Anchor PDA Accounts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {agreements.map((a) => {
            const releasedCount = a.milestones.filter(
              (m) => m.state === MilestoneState.RELEASED
            ).length;

            return (
              <div
                key={a.publicKey}
                className="p-3 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <Link
                      href={`/agreements/${a.publicKey}`}
                      className="font-bold text-zinc-100 hover:text-cyan-400 truncate"
                    >
                      {a.title}
                    </Link>
                    <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">
                      ${formatUsdc(a.totalAmountUsdc)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                    {a.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800 pt-2">
                  <span>
                    {releasedCount}/{a.milestones.length} Milestones Settled
                  </span>
                  <Link
                    href={`/agreements/${a.publicKey}`}
                    className="text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Open Console <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
