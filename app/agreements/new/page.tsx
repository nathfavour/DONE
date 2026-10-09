'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { VerificationType } from '@/types/protocol';
import {
  hashAgreementTerms,
  hashDefinitionOfDone,
  uint8ArrayToHex,
} from '@/lib/protocol/hashing';
import { parseUsdc, truncateAddress } from '@/lib/solana';
import { protocolClient, DEMO_KEYS } from '@/lib/protocol/client';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  PlusCircle,
  Trash2,
  ShieldCheck,
  Hash,
  ArrowRight,
  Sparkles,
  User,
  Plus,
} from 'lucide-react';

interface MilestoneDraft {
  title: string;
  description: string;
  amountUsdcString: string;
  verificationType: VerificationType;
  criteria: string[];
  computedDodHash: string;
}

// Quick interactive templates
const PRESETS = [
  {
    id: 'audit',
    label: '🛡️ Contract Audit',
    title: 'Rust Anchor Smart Contract Audit',
    description: 'Security review and invariant fuzzing of protocol escrow vaults.',
    termsText: '1. Definition of Done must strictly match on-chain criteria.\n2. Work artifacts hosted on Arweave.\n3. Disbursals are final upon block confirmation.',
    worker: DEMO_KEYS.WORKER,
    milestones: [
      {
        title: 'Static Analysis & Threat Model',
        description: 'Comprehensive CPI call-path review and cargo-audit pass.',
        amountUsdcString: '4000',
        verificationType: VerificationType.SPONSOR,
        criteria: [
          'Architecture threat model covering CPI paths',
          'Zero unaddressed high-risk cargo audit alerts',
        ],
        computedDodHash: '',
      },
      {
        title: 'Trident Invariant Fuzzing',
        description: 'Fuzz test suite verifying escrow solvency under fault conditions.',
        amountUsdcString: '6000',
        verificationType: VerificationType.SPONSOR,
        criteria: [
          'Trident fuzz run for 10M+ iterations',
          'PR merged to core test repository',
        ],
        computedDodHash: '',
      },
    ],
  },
  {
    id: 'frontend',
    label: '⚡ Next.js UI Delivery',
    title: 'Done Protocol Next.js Web App',
    description: 'Production web app with pitch-black UI, flyout drawers, and wallet bindings.',
    termsText: '1. Meets zero modal invariant (drawers only).\n2. TypeScript strictly typed.\n3. All Anchor instructions tested on Devnet.',
    worker: DEMO_KEYS.WORKER,
    milestones: [
      {
        title: 'Shell, Wallet & Agreements Feed',
        description: 'App shell, responsive navigation, and live agreements overview.',
        amountUsdcString: '3500',
        verificationType: VerificationType.SPONSOR,
        criteria: [
          'AppShell with desktop left-nav & mobile dock',
          'Live Solana Devnet RPC hook integration',
        ],
        computedDodHash: '',
      },
      {
        title: 'Contextual Drawers & Settlement',
        description: 'Evidence submission, DoD verification audit, and escrow disbursals.',
        amountUsdcString: '4500',
        verificationType: VerificationType.SPONSOR,
        criteria: [
          'SlideDrawer with right flyout & mobile sheet',
          'One-click verification and settlement flow',
        ],
        computedDodHash: '',
      },
    ],
  },
  {
    id: 'bot',
    label: '🤖 Oracle Verification Bot',
    title: 'Automated GitHub CI/CD Oracle',
    description: 'Event-driven Oracle verifying PR merges and committing proofs to Devnet.',
    termsText: '1. Cryptographic proof signatures verified on-chain.\n2. 99.9% uptime SLA.',
    worker: DEMO_KEYS.ORACLE,
    milestones: [
      {
        title: 'GitHub Webhook Ingestion Engine',
        description: 'Serverless parser verifying SHA commit signatures against DoD.',
        amountUsdcString: '3000',
        verificationType: VerificationType.ON_CHAIN_ORACLE,
        criteria: [
          'Webhook listener validating GitHub HMAC signature',
          'Automated proof generation to Solana Devnet',
        ],
        computedDodHash: '',
      },
      {
        title: 'Attestation & Auto-Disburse Pipe',
        description: 'Autonomous trigger calling verify_milestone instruction.',
        amountUsdcString: '5000',
        verificationType: VerificationType.ON_CHAIN_ORACLE,
        criteria: [
          'Multi-signature oracle consensus rule',
          'End-to-end automated settlement verified',
        ],
        computedDodHash: '',
      },
    ],
  },
  {
    id: 'bounty',
    label: '🎯 Rapid Bug Bounty',
    title: 'Escrow Math Overflow Investigation',
    description: 'Targeted research into token balance precision and edge cases.',
    termsText: '1. PoC exploit delivered with unit test.\n2. Non-disclosure until patched.',
    worker: DEMO_KEYS.WORKER,
    milestones: [
      {
        title: 'PoC Exploit Demonstration',
        description: 'Reproducible Anchor test showcasing the edge-case behavior.',
        amountUsdcString: '2500',
        verificationType: VerificationType.SPONSOR,
        criteria: [
          'Self-contained reproduction script with Anchor test',
          'Detailed remediation recommendation',
        ],
        computedDodHash: '',
      },
    ],
  },
];

export default function NewAgreementPage() {
  const router = useRouter();
  const { publicKeyString } = useWallet();
  const { txState, execute, reset, isOpen } = useTransactionExecution();

  // Form State
  const [workerPubkey, setWorkerPubkey] = useState(DEMO_KEYS.WORKER);
  const [title, setTitle] = useState('Rust Anchor Smart Contract Audit');
  const [description, setDescription] = useState(
    'Comprehensive security review and invariant testing of protocol escrow vaults.'
  );
  const [termsText, setTermsText] = useState(
    '1. Milestones strictly satisfy committed Definition of Done.\n2. Work artifacts permanently hosted on Arweave/IPFS.\n3. Disbursals are final upon block confirmation.'
  );
  const [computedTermsHash, setComputedTermsHash] = useState('');

  // Milestones State
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(PRESETS[0].milestones);

  // Apply Preset
  const applyPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setTitle(p.title);
    setDescription(p.description);
    setTermsText(p.termsText);
    setWorkerPubkey(p.worker);
    setMilestones(p.milestones.map((m) => ({ ...m })));
  };

  // Compute Terms Hash
  useEffect(() => {
    let active = true;
    const compute = async () => {
      const buffer = await hashAgreementTerms({ title, description, termsText });
      if (active) setComputedTermsHash(uint8ArrayToHex(buffer));
    };
    compute();
    return () => {
      active = false;
    };
  }, [title, description, termsText]);

  // Compute DoD Hashes
  const criteriaSignature = JSON.stringify(milestones.map((m) => m.criteria));
  useEffect(() => {
    let active = true;
    const computeAll = async () => {
      const parsed = JSON.parse(criteriaSignature) as string[][];
      const hashes = await Promise.all(
        parsed.map(async (crits) => {
          const buffer = await hashDefinitionOfDone(crits.filter(Boolean));
          return uint8ArrayToHex(buffer);
        })
      );
      if (active) {
        setMilestones((prev) =>
          prev.map((m, idx) => ({
            ...m,
            computedDodHash: hashes[idx] || '',
          }))
        );
      }
    };
    computeAll();
    return () => {
      active = false;
    };
  }, [criteriaSignature]);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length + 1}: Deliverable`,
        description: 'Deliverable specification...',
        amountUsdcString: '2500',
        verificationType: VerificationType.SPONSOR,
        criteria: ['Verifiable output artifact committed', 'Test verification passed'],
        computedDodHash: '',
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    const next = [...milestones];
    next[index] = { ...next[index], ...patch };
    setMilestones(next);
  };

  const adjustMilestoneAmount = (mIdx: number, delta: number) => {
    const current = parseFloat(milestones[mIdx].amountUsdcString) || 0;
    const updated = Math.max(100, current + delta);
    updateMilestone(mIdx, { amountUsdcString: updated.toString() });
  };

  const addCriterion = (mIdx: number, defaultText: string = '') => {
    const next = [...milestones];
    next[mIdx].criteria.push(defaultText);
    setMilestones(next);
  };

  const updateCriterion = (mIdx: number, cIdx: number, val: string) => {
    const next = [...milestones];
    next[mIdx].criteria[cIdx] = val;
    setMilestones(next);
  };

  const removeCriterion = (mIdx: number, cIdx: number) => {
    const next = [...milestones];
    next[mIdx].criteria = next[mIdx].criteria.filter((_, i) => i !== cIdx);
    setMilestones(next);
  };

  const totalBudgetUsdc = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amountUsdcString) || 0),
    0
  );

  const handleCreateAgreement = async () => {
    try {
      new PublicKey(workerPubkey);
    } catch {
      alert('Invalid Solana Worker Public Key');
      return;
    }

    const termsBuffer = await hashAgreementTerms({ title, description, termsText });

    const result = await execute(
      'createAgreement',
      `Init Agreement with worker ${truncateAddress(workerPubkey, 4)} & ${milestones.length} milestones`,
      async () => {
        const agRes = await protocolClient.createAgreement({
          worker: new PublicKey(workerPubkey),
          termsHash: termsBuffer,
          milestoneCount: milestones.length,
          title,
          description,
          termsText,
        });

        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          const dodBuffer = await hashDefinitionOfDone(m.criteria.filter(Boolean));
          const rawAmount = parseUsdc(m.amountUsdcString);

          await protocolClient.createMilestone({
            agreement: agRes.agreementPda,
            index: i,
            amount: rawAmount,
            dodHash: dodBuffer,
            verificationType: m.verificationType,
            title: m.title,
            description: m.description,
            dodCriteria: m.criteria.filter(Boolean),
          });
        }

        return agRes;
      }
    );

    if (result) {
      setTimeout(() => {
        router.push(`/agreements/${result.agreementPda.toBase58()}`);
      }, 800);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 font-mono text-neutral-100">
      <TxStateModal state={txState} isOpen={isOpen} onClose={reset} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-violet-400 mb-0.5">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold tracking-wider">NEW AGREEMENT WIZARD</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Create Agreement</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/agreements')}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreateAgreement}>
            <span>Initialize & Fund</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* 1-Click Template Buttons */}
      <div className="bg-[#0d0d0f] border border-[#26262a] p-3 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold text-neutral-200 uppercase text-[11px]">Quick Templates:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-[#1f1b2e] border border-[#26262a] hover:border-violet-500/40 text-xs text-neutral-200 hover:text-white transition-all active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsor Step Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Agreement Parameters
            </h3>
          </div>
          {computedTermsHash && (
            <span className="text-[10px] text-violet-400 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-lg truncate max-w-[200px]">
              SHA-256: {computedTermsHash.slice(0, 12)}...
            </span>
          )}
        </div>

        {/* Worker Address with Quick Buttons */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-300 uppercase tracking-wide">
              Worker Solana Address
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWorkerPubkey(DEMO_KEYS.WORKER)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-[#141416] hover:bg-[#1e1a29] border border-[#26262a] text-neutral-300 hover:text-violet-300"
              >
                Demo Worker
              </button>
              <button
                type="button"
                onClick={() => setWorkerPubkey(DEMO_KEYS.ORACLE)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-[#141416] hover:bg-[#1e1a29] border border-[#26262a] text-neutral-300 hover:text-violet-300"
              >
                Oracle Bot
              </button>
              {publicKeyString && (
                <button
                  type="button"
                  onClick={() => setWorkerPubkey(publicKeyString)}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-[#141416] hover:bg-[#1e1a29] border border-[#26262a] text-neutral-300 hover:text-violet-300"
                >
                  My Wallet
                </button>
              )}
            </div>
          </div>
          <Input
            value={workerPubkey}
            onChange={(e) => setWorkerPubkey(e.target.value)}
            placeholder="Base58 Solana Address..."
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="AGREEMENT TITLE"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="SCOPE & OBJECTIVES"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
        </div>
      </Card>

      {/* Milestone Builder Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Milestones ({milestones.length})
            </h3>
          </div>
          <Button variant="secondary" size="sm" onClick={addMilestone}>
            <PlusCircle className="w-3.5 h-3.5 mr-1 text-violet-400" />
            Add Milestone
          </Button>
        </div>

        {milestones.map((m, mIdx) => (
          <div
            key={mIdx}
            className="p-4 sm:p-5 bg-[#0d0d0f] border border-[#26262a] rounded-2xl space-y-3.5 hover:border-[#323238] transition-colors"
          >
            {/* Milestone Header */}
            <div className="flex items-center justify-between border-b border-[#26262a] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-[#141416] border border-violet-500/30 text-xs font-bold text-violet-300">
                  #{mIdx + 1}
                </span>
                <span className="text-xs font-bold text-white truncate max-w-sm">{m.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {m.computedDodHash && (
                  <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                    DoD: {m.computedDodHash.slice(0, 10)}...
                  </span>
                )}
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(mIdx)}
                    className="text-neutral-500 hover:text-red-400 text-xs p-1"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Title & Amount with Increment Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="MILESTONE TITLE"
                  value={m.title}
                  onChange={(e) => updateMilestone(mIdx, { title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-300 uppercase tracking-wide">
                    Amount (USDC)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustMilestoneAmount(mIdx, 500)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#141416] hover:bg-violet-900/40 text-violet-300 border border-[#26262a]"
                    >
                      +500
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustMilestoneAmount(mIdx, 1000)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#141416] hover:bg-violet-900/40 text-violet-300 border border-[#26262a]"
                    >
                      +1K
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={m.amountUsdcString}
                  onChange={(e) => updateMilestone(mIdx, { amountUsdcString: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Verification Mode Selector: Button Segment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 uppercase tracking-wide">
                Verification Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: VerificationType.SPONSOR, label: '👤 Sponsor Sign-off' },
                  { type: VerificationType.ON_CHAIN_ORACLE, label: '⚡ Oracle / Bot' },
                  { type: VerificationType.ATTESTATION, label: '📜 Attestation' },
                ].map((mode) => {
                  const isActive = m.verificationType === mode.type;
                  return (
                    <button
                      key={mode.type}
                      type="button"
                      onClick={() => updateMilestone(mIdx, { verificationType: mode.type })}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-violet-600/25 border border-violet-500 text-white font-bold shadow-sm'
                          : 'bg-[#141416] border border-[#202024] text-neutral-400 hover:text-white hover:border-[#26262a]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Definition of Done Checklist with Quick Condition Adders */}
            <div className="space-y-2 pt-2 border-t border-[#26262a]">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Definition of Done Criteria ({m.criteria.length})
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addCriterion(mIdx, 'Pull request merged into target repo')}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-[#141416] hover:bg-violet-900/30 text-neutral-300 hover:text-violet-300 border border-[#26262a]"
                  >
                    + PR Merged
                  </button>
                  <button
                    type="button"
                    onClick={() => addCriterion(mIdx, '100% tests pass with zero regression')}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-[#141416] hover:bg-violet-900/30 text-neutral-300 hover:text-violet-300 border border-[#26262a]"
                  >
                    + Tests Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => addCriterion(mIdx)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 inline-flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3 h-3" /> Custom
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {m.criteria.map((crit, cIdx) => (
                  <div key={cIdx} className="flex gap-2 items-center">
                    <span className="text-[11px] font-bold text-violet-400 w-5">
                      #{cIdx + 1}
                    </span>
                    <Input
                      value={crit}
                      onChange={(e) => updateCriterion(mIdx, cIdx, e.target.value)}
                      placeholder="Verifiable completion condition..."
                    />
                    {m.criteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriterion(mIdx, cIdx)}
                        className="p-2 text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="p-4 sm:p-5 bg-[#0d0d0f] border border-[#26262a] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-neutral-400 text-xs uppercase block font-semibold">Total Escrow</span>
          <div className="text-2xl font-bold text-white">
            ${totalBudgetUsdc.toLocaleString()} <span className="text-xs text-neutral-400">USDC</span>
          </div>
          <span className="text-[11px] text-violet-400">
            {milestones.length} Milestones ready to deploy on Devnet
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push('/agreements')}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateAgreement}
            className="flex-1 sm:flex-none"
          >
            <span>Initialize & Fund Escrow</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
