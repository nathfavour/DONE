'use client';

import React, { useState } from 'react';
import { useWallet } from './WalletContext';
import { truncateAddress, formatUsdc, getExplorerUrl } from '@/lib/solana';
import { Button } from '../ui/Button';
import { ChevronDown, Copy, Check, ExternalLink, Droplets, Wallet, ShieldCheck, RefreshCw } from 'lucide-react';
import { DoneLogo } from '../protocol/DoneLogo';

export function WalletConnectButton() {
  const {
    connected,
    isConnecting,
    publicKeyString,
    walletName,
    usdcBalance,
    solBalance,
    connect,
    disconnect,
    requestDevnetUsdcFaucet,
    requestDevnetSolAirdrop,
    refreshBalances,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  const handleCopy = () => {
    if (!publicKeyString) return;
    navigator.clipboard.writeText(publicKeyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAirdropSol = async () => {
    setIsAirdropping(true);
    await requestDevnetSolAirdrop();
    setIsAirdropping(false);
  };

  const handleFaucetUsdc = () => {
    requestDevnetUsdcFaucet(5_000_000_000);
    setFaucetSuccess(true);
    setTimeout(() => setFaucetSuccess(false), 2000);
  };

  if (!connected) {
    return (
      <Button
        variant="primary"
        size="sm"
        isLoading={isConnecting}
        onClick={() => connect()}
        className="flex items-center gap-2"
      >
        <Wallet className="w-3.5 h-3.5" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative font-mono text-xs">
      <div className="flex items-center gap-1.5 bg-[#0d0d0f] border border-[#26262a] rounded-xl p-1 shadow-sm">
        {/* Balances */}
        <div className="px-2.5 py-1 bg-[#141416] rounded-lg text-neutral-300 hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-violet-400 font-semibold">${formatUsdc(usdcBalance)}</span>
          <span className="text-neutral-500 text-[10px]">USDC</span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-300 font-medium">{solBalance} SOL</span>
        </div>

        {/* Address and Wallet pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 text-neutral-200 hover:text-white hover:bg-[#141416] rounded-lg transition-colors focus:outline-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-[11px] text-white">
            {truncateAddress(publicKeyString, 4)}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Account Details Drawer / Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-[#0d0d0f] border border-[#26262a] rounded-2xl shadow-2xl p-4 z-50 text-neutral-300 animate-in fade-in duration-150 backdrop-blur-md"
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header with Done Logo */}
          <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
            <div className="flex items-center gap-2">
              <DoneLogo className="w-5 h-5" />
              <div>
                <span className="text-xs font-bold text-white block">{walletName}</span>
                <span className="text-[10px] text-violet-400 font-medium">Solana Devnet</span>
              </div>
            </div>
            <button
              onClick={() => refreshBalances()}
              className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
              title="Refresh on-chain balance"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connected Address Card */}
          <div className="mt-3 p-2.5 bg-[#141416] rounded-xl border border-[#26262a]">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-1">
              Live Wallet Address
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-violet-300 truncate">
                {publicKeyString}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#1f1f23] transition-colors"
                  title="Copy Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={getExplorerUrl(publicKeyString, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#1f1f23] transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Faucet Actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleFaucetUsdc}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/30 transition-colors text-xs font-medium"
            >
              <Droplets className="w-3.5 h-3.5" />
              {faucetSuccess ? 'Claimed +$5k' : '+5,000 USDC'}
            </button>

            <button
              onClick={handleAirdropSol}
              disabled={isAirdropping}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#141416] hover:bg-[#1e1a29] text-neutral-200 border border-[#26262a] transition-colors text-xs font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              {isAirdropping ? 'Airdropping...' : '+1.0 SOL'}
            </button>
          </div>

          {/* Disconnect */}
          <div className="mt-3 pt-3 border-t border-[#26262a] flex justify-end">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium px-2 py-1"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
