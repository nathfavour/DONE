'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DoneLogo } from './DoneLogo';
import { NetworkBadge } from '../web3/NetworkBadge';
import { WalletConnectButton } from '../web3/WalletConnectButton';
import { useWallet, WalletRole } from '../web3/WalletContext';
import { formatUsdc } from '@/lib/solana';
import {
  PlusCircle,
  Briefcase,
  Shield,
  Search,
  Droplets,
  Layers,
  Activity,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { role, switchRole, usdcBalance, requestDevnetUsdcFaucet } = useWallet();

  const roleConfigs: { id: WalletRole; label: string; icon: any; color: string }[] = [
    { id: 'sponsor', label: 'Sponsor (Alice)', icon: Shield, color: 'text-cyan-400' },
    { id: 'worker', label: 'Worker (Bob)', icon: Briefcase, color: 'text-amber-400' },
    { id: 'oracle', label: 'Verifier / Oracle', icon: Search, color: 'text-purple-400' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <DoneLogo className="w-8 h-8" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-base tracking-wider text-zinc-100 group-hover:text-cyan-400 transition-colors">
                  DONE
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-none font-bold">
                  DAPP
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-400 tracking-tight leading-none">
                SOLANA SETTLEMENT
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 font-mono text-xs">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border ${
                pathname === '/'
                  ? 'border-cyan-500/50 bg-zinc-900 text-cyan-300 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Live Workspace
            </Link>
            <Link
              href="/sponsor"
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border ${
                pathname === '/sponsor'
                  ? 'border-cyan-500/50 bg-zinc-900 text-cyan-300 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Sponsor Portfolio
            </Link>
            <Link
              href="/worker"
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border ${
                pathname === '/worker'
                  ? 'border-cyan-500/50 bg-zinc-900 text-cyan-300 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Worker Hub
            </Link>
          </nav>
        </div>

        {/* Center: Live Role Switcher Tool */}
        <div className="hidden xl:flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1">
          <span className="text-[10px] text-zinc-400 font-mono px-2 uppercase font-semibold">
            Act as:
          </span>
          {roleConfigs.map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium transition-all ${
                  active
                    ? 'bg-zinc-800 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: New Agreement CTA + Wallet & Faucet */}
        <div className="flex items-center gap-2">
          {/* 1-Click Faucet Button */}
          <button
            onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
            title="Airdrop +5,000 Devnet USDC"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 font-mono text-xs text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 hover:border-cyan-600 transition-colors"
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">+5K USDC</span>
          </button>

          <Link
            href="/agreements/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-black" />
            <span className="hidden sm:inline">New Agreement</span>
            <span className="sm:hidden">New</span>
          </Link>

          <NetworkBadge />
          <WalletConnectButton />
        </div>
      </div>

      {/* Mobile role switcher bar */}
      <div className="xl:hidden flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950 px-3 py-1.5 font-mono text-xs">
        <span className="text-[10px] text-zinc-400 font-semibold uppercase">Role:</span>
        <div className="flex items-center gap-1">
          {roleConfigs.map((r) => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                className={`px-2 py-0.5 text-[11px] font-medium border ${
                  active
                    ? 'bg-zinc-800 border-cyan-400 text-cyan-300'
                    : 'text-zinc-400 border-zinc-800'
                }`}
              >
                {r.id.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
          className="text-cyan-400 text-[10px] hover:underline"
        >
          +5K USDC
        </button>
      </div>
    </header>
  );
}
