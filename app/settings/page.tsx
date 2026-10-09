'use client';

import React, { useState } from 'react';
import { useWallet } from '@/components/web3/WalletContext';
import { protocolClient } from '@/lib/protocol/client';
import { useQueryClient } from '@tanstack/react-query';
import { DEVNET_USDC_MINT, DONE_PROGRAM_ID, getExplorerUrl, truncateAddress, formatUsdc } from '@/lib/solana';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  Settings as SettingsIcon,
  RotateCcw,
  CheckCircle2,
  Activity,
  Droplets,
  FileText,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export default function SettingsDiagnosticsPage() {
  const {
    currentSlot,
    rpcLatencyMs,
    publicKeyString,
    requestDevnetUsdcFaucet,
    requestDevnetSolAirdrop,
  } = useWallet();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'logs'>('general');
  const [logs, setLogs] = useState(() => protocolClient.getLogs());
  const [resetMessage, setResetMessage] = useState(false);

  const handleClearLogs = () => {
    protocolClient.clearLogs();
    setLogs([]);
  };

  const handleResetData = async () => {
    protocolClient.clearAllData();
    await queryClient.invalidateQueries();
    setLogs([]);
    setResetMessage(true);
    setTimeout(() => setResetMessage(false), 2000);
  };

  const refreshLogs = () => {
    setLogs(protocolClient.getLogs());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-neutral-100">
      {/* Header with Done Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2 text-xs text-violet-400">
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">PROTOCOL CONFIG</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Settings & Logs</h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#000000] border border-[#26262a] p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'general'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            General
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              refreshLogs();
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Logs
            {logs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                {logs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <>
          {/* Cluster & RPC Status */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Network & RPC
              </h3>
              <span className="px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-bold">
                SOLANA DEVNET
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">NETWORK</span>
                <span className="font-bold text-neutral-200">Solana Devnet</span>
              </div>
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">CURRENT SLOT</span>
                <span className="font-bold text-neutral-200 tabular-nums">#{currentSlot.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">LATENCY</span>
                <span className="font-bold text-emerald-400 tabular-nums">{rpcLatencyMs}ms</span>
              </div>
            </div>
          </Card>

          {/* Program & Token Contracts */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Smart Contract Deployments
              </h3>
              <span className="text-xs text-neutral-400">DEVNET</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  PROGRAM ID:
                </span>
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl font-mono text-violet-300 break-all select-all">
                  {DONE_PROGRAM_ID.toBase58()}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  USDC DEVNET MINT:
                </span>
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl font-mono text-emerald-400 break-all select-all">
                  {DEVNET_USDC_MINT.toBase58()}
                </div>
              </div>
            </div>
          </Card>

          {/* Faucet & Clear Data */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Account Faucet & State
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
                >
                  <Droplets className="w-3.5 h-3.5 mr-1" />
                  +5,000 Devnet USDC
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestDevnetSolAirdrop}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-violet-400" />
                  +1.0 Devnet SOL
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetData}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear Local Storage
                </Button>
                {resetMessage && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                  </span>
                )}
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* Settings > Logs Sub-tab */
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Protocol Activity Logs
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                On-chain transactions and protocol state transitions
              </p>
            </div>
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                className="text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Clear Logs
              </Button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <DoneLogo className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-neutral-400 text-xs">No protocol activity logged yet.</p>
              <p className="text-neutral-600 text-[11px]">
                Create an agreement or verify a milestone to record live transactions.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <a
                      href={getExplorerUrl(log.signature, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <span>{truncateAddress(log.signature, 4)}</span>
                      <ExternalLink className="w-3 h-3 text-violet-400" />
                    </a>
                  </div>

                  <p className="text-neutral-200 text-xs">{log.details}</p>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-[#26262a]/60">
                    <span>PDA: {truncateAddress(log.agreementPda, 4)}</span>
                    {log.amountUsdc ? (
                      <span className="text-emerald-400 font-semibold">
                        ${formatUsdc(log.amountUsdc)} USDC
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
