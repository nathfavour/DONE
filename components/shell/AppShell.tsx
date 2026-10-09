'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DoneLogo } from '../protocol/DoneLogo';
import { useWallet, WalletRole } from '../web3/WalletContext';
import { truncateAddress, formatUsdc } from '@/lib/solana';
import {
  LayoutDashboard,
  FileCode,
  Shield,
  Briefcase,
  Settings,
  PlusCircle,
  Droplets,
  Activity,
  Check,
  Copy,
  ChevronDown,
} from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    publicKeyString,
    role,
    switchRole,
    usdcBalance,
    solBalance,
    currentSlot,
    rpcLatencyMs,
    requestDevnetUsdcFaucet,
  } = useWallet();

  const [copied, setCopied] = React.useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/agreements', label: 'Agreements', icon: FileCode },
    { href: '/sponsor', label: 'Sponsor View', icon: Shield },
    { href: '/worker', label: 'Worker View', icon: Briefcase },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleCopy = () => {
    if (!publicKeyString) return;
    navigator.clipboard.writeText(publicKeyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-100 flex font-mono selection:bg-neutral-800 selection:text-white">
      {/* 2.1 Desktop: Fixed Left Navigation (w-64, #0d0d0f, border-r border-[#26262a]) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0d0d0f] border-r border-[#26262a] fixed inset-y-0 left-0 z-40 select-none">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#26262a]">
          <DoneLogo className="w-7 h-7" />
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-widest text-white">DONE</span>
            <span className="text-[10px] text-neutral-400 -mt-1 tracking-tight">SETTLEMENT PROTOCOL</span>
          </div>
        </div>

        {/* Navigation Targets */}
        <div className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#141416] text-white border border-violet-500/40 shadow-sm shadow-violet-950/40'
                    : 'text-neutral-400 hover:text-white hover:bg-[#141416]/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4">
            <Link
              href="/agreements/new"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-violet-600/25 border border-violet-500/40 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Agreement</span>
            </Link>
          </div>
        </div>

        {/* Desktop Left Nav Footer: Role Switcher & Network */}
        <div className="p-4 border-t border-[#26262a] space-y-2 text-xs">
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-[#141416] border border-[#202024] hover:border-violet-500/40 text-neutral-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    role === 'sponsor'
                      ? 'bg-violet-400 shadow-sm shadow-violet-400'
                      : role === 'worker'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[11px] font-semibold uppercase">{role} ROLE</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute bottom-full left-0 mb-1.5 w-full bg-[#0d0d0f] border border-[#26262a] rounded-xl shadow-2xl p-1.5 z-50 space-y-1"
                onMouseLeave={() => setRoleDropdownOpen(false)}
              >
                {(['sponsor', 'worker', 'oracle'] as WalletRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize ${
                      role === r ? 'bg-[#141416] text-white font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r === 'oracle' ? 'Verifier / Oracle' : r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Solana Devnet
            </span>
            <span>{rpcLatencyMs}ms</span>
          </div>
        </div>
      </aside>

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Context Bar (Desktop: Devnet, RPC ping, Wallet Pill; Mobile: Logo + Actions) */}
        <header className="h-16 px-4 md:px-8 border-b border-[#26262a] bg-[#0d0d0f] flex items-center justify-between sticky top-0 z-30">
          {/* Mobile brand (hidden on desktop) */}
          <div className="md:hidden flex items-center gap-2">
            <DoneLogo className="w-6 h-6" />
            <span className="font-extrabold text-sm tracking-wider text-white">DONE</span>
          </div>

          {/* Desktop Left: Live Cluster & Slot */}
          <div className="hidden md:flex items-center gap-3 text-xs text-neutral-400">
            <span className="px-2.5 py-1 rounded-lg bg-[#141416] border border-[#202024] text-neutral-300 text-[11px]">
              CLUSTER: DEVNET
            </span>
            <span>SLOT #{currentSlot.toLocaleString()}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Activity className="w-3 h-3" />
              RPC ONLINE ({rpcLatencyMs}ms)
            </span>
          </div>

          {/* Right: Balance Pill & Wallet Pill */}
          <div className="flex items-center gap-2.5">
            {/* Quick Faucet button */}
            <button
              onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-[#1e1a29] border border-[#26262a] hover:border-violet-500/40 text-violet-300 text-xs font-medium transition-all shadow-sm"
              title="Airdrop +5,000 Devnet USDC"
            >
              <Droplets className="w-3.5 h-3.5 text-violet-400" />
              <span>+5K USDC</span>
            </button>

            {/* Wallet & Balance Pill */}
            <div className="flex items-center bg-[#141416] border border-[#202024] rounded-xl p-1 text-xs">
              <div className="px-2.5 py-1 text-emerald-400 font-bold border-r border-[#26262a] hidden sm:block">
                ${formatUsdc(usdcBalance)} <span className="text-[10px] text-neutral-400 font-normal">USDC</span>
              </div>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 text-neutral-300 hover:text-white flex items-center gap-1.5 font-mono text-xs"
                title="Click to copy public key"
              >
                <span>{truncateAddress(publicKeyString, 4)}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
              </button>
            </div>
          </div>
        </header>

        {/* 2.1 Main Viewport (Max width container, p-4 md:p-8) */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* 2.2 Mobile Layout: Fixed Bottom Navigation Bar (Docked, rounded-t-2xl, h-16, 5 icon tabs) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0d0d0f] border-t border-[#26262a] rounded-t-2xl z-40 flex items-center justify-around px-2 select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
                active ? 'text-violet-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
