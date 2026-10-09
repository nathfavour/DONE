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
    connectError,
    connect,
    disconnect,
    clearError,
    requestDevnetUsdcFaucet,
    requestDevnetSolAirdrop,
    refreshBalances,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [importAddrInput, setImportAddrInput] = useState('');
  const [showImportField, setShowImportField] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  const hasPhantom = typeof window !== 'undefined' && Boolean((window as unknown as { solana?: { isPhantom?: boolean } }).solana);
  const hasSolflare = typeof window !== 'undefined' && Boolean((window as unknown as { solflare?: { isSolflare?: boolean } }).solflare);

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

  const handleConnectOption = async (option: 'phantom' | 'solflare' | 'custom') => {
    clearError();
    if (option === 'custom') {
      if (!importAddrInput.trim()) return;
      const success = await connect('custom', importAddrInput.trim());
      if (success) {
        setIsConnectModalOpen(false);
        setShowImportField(false);
      }
    } else {
      const success = await connect(option);
      if (success) {
        setIsConnectModalOpen(false);
        setShowImportField(false);
      }
    }
  };

  if (!connected) {
    return (
      <>
        <Button
          variant="primary"
          size="sm"
          isLoading={isConnecting}
          onClick={() => {
            clearError();
            setIsConnectModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Connect Wallet</span>
        </Button>

        {/* Connect Wallet Selection Modal */}
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#000000] border border-[#26262a] rounded-2xl p-5 shadow-2xl font-mono text-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
                <div className="flex items-center gap-2.5">
                  <DoneLogo className="w-6 h-6" />
                  <div>
                    <h3 className="font-bold text-sm text-white">Connect Solana Wallet</h3>
                    <p className="text-[11px] text-neutral-400">Select a real Solana provider</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConnectModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
                >
                  ✕
                </button>
              </div>

              {connectError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-1">
                  <span className="font-bold">Connection Failed:</span>
                  <span>{connectError}</span>
                </div>
              )}

              <div className="space-y-2">
                {/* Phantom */}
                <button
                  type="button"
                  onClick={() => handleConnectOption('phantom')}
                  className="w-full p-3.5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/50 rounded-xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xs">
                      PH
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-violet-300">
                          Phantom Wallet
                        </span>
                        {hasPhantom && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                            Detected
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        Browser extension or mobile Solana wallet
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-violet-400 group-hover:translate-x-0.5 transition-transform">
                    Connect →
                  </span>
                </button>

                {/* Solflare */}
                <button
                  type="button"
                  onClick={() => handleConnectOption('solflare')}
                  className="w-full p-3.5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/50 rounded-xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                      SF
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-amber-300">
                          Solflare Wallet
                        </span>
                        {hasSolflare && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                            Detected
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        Solana native web & extension wallet
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    Connect →
                  </span>
                </button>

                {/* Import Address */}
                <div className="pt-1">
                  {!showImportField ? (
                    <button
                      type="button"
                      onClick={() => setShowImportField(true)}
                      className="text-[11px] text-neutral-400 hover:text-violet-300 underline py-1 block"
                    >
                      Or connect custom Solana public address...
                    </button>
                  ) : (
                    <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
                      <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                        Solana Base58 Public Key
                      </label>
                      <input
                        type="text"
                        value={importAddrInput}
                        onChange={(e) => setImportAddrInput(e.target.value)}
                        placeholder="Paste your 32-44 char Solana public key..."
                        className="w-full bg-[#000000] border border-[#26262a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowImportField(false)}
                          className="px-2.5 py-1 text-neutral-400 text-[11px] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectOption('custom')}
                          disabled={!importAddrInput.trim()}
                          className="px-3 py-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Connect Address
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative font-mono text-xs">
      <div className="flex items-center gap-1.5 bg-[#000000] border border-[#26262a] rounded-xl p-1 shadow-sm">
        {/* Balances */}
        <div className="px-2.5 py-1 bg-[#000000] border border-neutral-900 rounded-lg text-neutral-300 hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-violet-400 font-semibold">${formatUsdc(usdcBalance)}</span>
          <span className="text-neutral-500 text-[10px]">USDC</span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-300 font-medium">{solBalance} SOL</span>
        </div>

        {/* Address and Wallet pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 text-neutral-200 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors focus:outline-none"
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
          className="absolute right-0 mt-2 w-80 bg-[#000000] border border-[#26262a] rounded-2xl shadow-2xl p-4 z-50 text-neutral-300 animate-in fade-in duration-150 backdrop-blur-md"
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
          <div className="mt-3 p-2.5 bg-[#000000] rounded-xl border border-[#26262a]">
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
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
                  title="Copy Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={getExplorerUrl(publicKeyString, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
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
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#000000] hover:bg-violet-950/20 text-neutral-200 border border-[#26262a] transition-colors text-xs font-medium"
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
