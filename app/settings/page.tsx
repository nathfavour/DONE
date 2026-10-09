'use client';

import React, { useState } from 'react';
import { useWallet } from '@/components/web3/WalletContext';
import { protocolClient } from '@/lib/protocol/client';
import { useQueryClient } from '@tanstack/react-query';
import { DEVNET_USDC_MINT, DONE_PROGRAM_ID } from '@/lib/solana';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Settings as SettingsIcon,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Activity,
  Layers,
  Shield,
  Droplets,
} from 'lucide-react';

export default function SettingsDiagnosticsPage() {
  const {
    cluster,
    currentSlot,
    rpcLatencyMs,
    publicKeyString,
    role,
    switchRole,
    requestDevnetUsdcFaucet,
    requestDevnetSolAirdrop,
  } = useWallet();

  const queryClient = useQueryClient();
  const [mockMode, setMockMode] = useState<boolean>(!protocolClient.isUsingLiveContract());
  const [customRpcUrl, setCustomRpcUrl] = useState('https://api.devnet.solana.com');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(false);

  const handleToggleMock = (enabled: boolean) => {
    setMockMode(enabled);
    protocolClient.setUseLiveContract(!enabled);
  };

  const handleResetStorage = async () => {
    setIsResetting(true);
    protocolClient.resetToDefaultSeed();
    await queryClient.invalidateQueries();
    setIsResetting(false);
    setResetMessage(true);
    setTimeout(() => setResetMessage(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-neutral-100">
      {/* Header */}
      <div className="border-b border-[#26262a] pb-4">
        <div className="flex items-center gap-2 text-xs text-violet-400 mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span className="font-bold tracking-wider">SYSTEM DIAGNOSTICS</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Settings & Diagnostics</h1>
      </div>

      {/* Cluster & RPC Status */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Solana Cluster Configuration
          </h3>
          <span className="px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-bold">
            DEVNET ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-1">CLUSTER</span>
            <span className="font-bold text-neutral-200">Solana Devnet</span>
          </div>
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-1">CURRENT SLOT</span>
            <span className="font-bold text-neutral-200 tabular-nums">#{currentSlot.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-1">RPC LATENCY</span>
            <span className="font-bold text-emerald-400 tabular-nums">{rpcLatencyMs}ms</span>
          </div>
        </div>

        <Input
          label="RPC ENDPOINT URL"
          value={customRpcUrl}
          onChange={(e) => setCustomRpcUrl(e.target.value)}
        />
      </Card>

      {/* Program & Token Addresses */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            On-Chain Program & Token Targets
          </h3>
          <span className="text-xs text-neutral-400">ANCHOR IDL BRIDGE</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
              DONE PROTOCOL PROGRAM ID:
            </span>
            <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl font-mono text-violet-300 break-all select-all">
              {DONE_PROGRAM_ID.toBase58()}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
              SPL USDC DEVNET MINT ADDRESS:
            </span>
            <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl font-mono text-emerald-400 break-all select-all">
              {DEVNET_USDC_MINT.toBase58()}
            </div>
          </div>
        </div>
      </Card>

      {/* Client Driver Mode & Sandbox Diagnostics */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Mock Mode & Storage Driver
          </h3>
          <span className="text-xs text-neutral-400">TESTBED</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#141416] border border-[#202024] rounded-xl">
          <div className="space-y-0.5">
            <div className="font-semibold text-white text-xs">Simulated Reactive Storage Driver</div>
            <p className="text-xs text-neutral-400">
              Immediate UI testing and state transitions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleMock(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mockMode ? 'bg-violet-600 text-white font-bold shadow-sm' : 'text-neutral-400 bg-neutral-800'
              }`}
            >
              Enabled
            </button>
            <button
              onClick={() => handleToggleMock(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !mockMode ? 'bg-violet-600 text-white font-bold shadow-sm' : 'text-neutral-400 bg-neutral-800'
              }`}
            >
              Live RPC
            </button>
          </div>
        </div>

        {/* Faucet & Seed Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => requestDevnetUsdcFaucet(5_000_000_000)}
            >
              <Droplets className="w-3.5 h-3.5 mr-1 text-violet-400" />
              Request +5K Devnet USDC
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={requestDevnetSolAirdrop}
            >
              Airdrop +1.0 SOL
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetStorage}
              disabled={isResetting}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Testbed State
            </Button>
            {resetMessage && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Reset Done
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
