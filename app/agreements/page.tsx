'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { AgreementState, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  FileCode,
  PlusCircle,
  ChevronRight,
  Search,
  Lock,
} from 'lucide-react';

export default function AgreementsExplorerPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { publicKeyString } = useWallet();

  const [activeFilter, setActiveFilter] = useState<'all' | 'sponsoring' | 'assigned' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'sponsoring', label: 'Sponsoring' },
    { id: 'assigned', label: 'Assigned (Worker)' },
    { id: 'completed', label: 'Completed' },
  ];

  const filteredAgreements = agreements.filter((a) => {
    // Role filter
    if (activeFilter === 'sponsoring' && a.sponsor !== publicKeyString) return false;
    if (activeFilter === 'assigned' && a.worker !== publicKeyString) return false;
    if (activeFilter === 'completed' && a.state !== AgreementState.COMPLETED) return false;

    // Search filter
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
      {/* Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <FileCode className="w-4 h-4 text-white" />
            <span>ON-CHAIN CATALOG</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Agreements Explorer</h1>
        </div>

        <Link href="/agreements/new">
          <Button variant="primary" size="md">
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Agreement
          </Button>
        </Link>
      </div>

      {/* Filter Segment Control & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented control */}
        <div className="flex items-center bg-[#0d0d0f] border border-[#26262a] p-1 rounded-xl">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === opt.id
                  ? 'bg-[#141416] text-white shadow-sm border border-[#26262a]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agreement, worker, address..."
            className="w-full sm:w-64 bg-[#0d0d0f] border border-[#26262a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition-colors"
          />
        </div>
      </div>

      {/* Agreement List Cards (rounded-2xl, #0d0d0f, hover border highlight) */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-neutral-400">Loading catalog accounts...</div>
      ) : filteredAgreements.length === 0 ? (
        <Card className="py-12 text-center text-xs text-neutral-500">
          No agreements found matching your filter.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredAgreements.map((agreement) => {
            const settledCount = agreement.milestones.filter(
              (m) => m.state === MilestoneState.RELEASED
            ).length;
            const settledAmount = agreement.milestones
              .filter((m) => m.state === MilestoneState.RELEASED)
              .reduce((sum, m) => sum + m.amountUsdc, 0);

            const progressPct =
              agreement.milestoneCount > 0
                ? Math.round((settledCount / agreement.milestoneCount) * 100)
                : 0;

            return (
              <Link
                key={agreement.publicKey}
                href={`/agreements/${agreement.publicKey}`}
                className="group block"
              >
                <div className="bg-[#0d0d0f] border border-[#26262a] group-hover:border-neutral-500 rounded-2xl p-5 transition-all space-y-4">
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {agreement.title}
                        </h3>
                        <AgreementStateBadge state={agreement.state} />
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-1">{agreement.description}</p>
                    </div>

                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="text-lg font-bold text-emerald-400">
                        ${formatUsdc(agreement.totalAmountUsdc)} <span className="text-xs text-neutral-400">USDC</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 block uppercase">
                        ${formatUsdc(settledAmount)} Released
                      </span>
                    </div>
                  </div>

                  {/* Middle row: Progress Track */}
                  <div className="space-y-1.5 pt-2 border-t border-[#202024]">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>
                        Milestones: <span className="text-neutral-200">{settledCount} / {agreement.milestoneCount} Settled</span>
                      </span>
                      <span>{progressPct}% Completed</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#141416] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom row: Monospace IDs */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400 font-mono">
                    <div className="flex items-center gap-4">
                      <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                      <span className="hidden sm:inline">Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400 group-hover:text-white transition-colors">
                      <span>Inspect Agreement</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
