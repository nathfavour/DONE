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
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import {
  ShieldCheck,
  PlusCircle,
  AlertCircle,
  ChevronRight,
  Lock,
} from 'lucide-react';

export default function SponsorDashboardPage() {
  const { publicKeyString, role, switchRole } = useWallet();
  const { data: agreements = [], isLoading } = useSponsorAgreements(publicKeyString);
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'verify',
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
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>CAPITAL SPONSOR PORTFOLIO</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Sponsor Escrow Console</h1>
        </div>

        <div className="flex items-center gap-3">
          {role !== 'sponsor' && (
            <button
              onClick={() => switchRole('sponsor')}
              className="text-xs text-cyan-400 hover:underline px-2.5 py-1 border border-cyan-800 bg-cyan-950/40"
            >
              Switch Role to Sponsor
            </button>
          )}
          <Link href="/agreements/new">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-black" />
              New Agreement
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            LOCKED IN ESCROW VAULTS
          </span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            ${formatUsdc(totalEscrowLocked)} <span className="text-xs text-zinc-400">USDC</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Active capital protection</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            TOTAL DISBURSED (SETTLED)
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ${formatUsdc(totalSettledPaid)} <span className="text-xs text-zinc-400">USDC</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Released upon verified DoD</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            PENDING VERIFICATIONS
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {pendingVerifications.length}{' '}
            <span className="text-xs text-zinc-400 font-normal">Milestones</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Awaiting sponsor audit</span>
        </div>
      </div>

      {/* Action Required: Pending Verification Audits */}
      {pendingVerifications.length > 0 && (
        <Card className="border-amber-900/70 bg-zinc-950">
          <CardHeader className="bg-amber-950/30 border-amber-900/50">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <h3 className="font-bold text-sm tracking-wider uppercase">
                ACTION REQUIRED: DELIVERABLES READY FOR AUDIT ({pendingVerifications.length})
              </h3>
            </div>
            <span className="text-[10px] text-amber-300 font-mono">NEEDS REVIEW</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingVerifications.map(({ agreement, milestone }) => (
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
                  onClick={() => openAction('verify', agreement, milestone)}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-black" />
                  Perform DoD Audit
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Sponsored Agreements */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
          Sponsored Agreements ({agreements.length})
        </h2>

        {isLoading ? (
          <div className="p-6 text-center text-xs text-zinc-400">Loading agreements...</div>
        ) : agreements.length === 0 ? (
          <div className="p-6 text-center border border-zinc-800 bg-zinc-950 space-y-2 text-xs">
            <p className="text-zinc-400">No agreements initialized under this sponsor keypair.</p>
            <Link href="/agreements/new">
              <Button variant="primary" size="sm">
                Create First Agreement
              </Button>
            </Link>
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
                    <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                    <span>•</span>
                    <span>Milestones: {agreement.milestones.length}</span>
                    {agreement.state === AgreementState.DRAFT && (
                      <span className="text-amber-400 font-bold">• Escrow Unfunded</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 block">
                      ${formatUsdc(agreement.totalAmountUsdc)} USDC
                    </span>
                    <span className="text-[10px] text-zinc-400">Total Budget</span>
                  </div>

                  {agreement.state === AgreementState.DRAFT ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAction('fund', agreement)}
                    >
                      <Lock className="w-3.5 h-3.5 mr-1 text-black" />
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
