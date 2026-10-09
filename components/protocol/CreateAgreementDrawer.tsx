'use client';

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import { VerificationType } from '@/types/protocol';
import { hashAgreementTerms, hashDoDCriteria } from '@/lib/protocol/hashing';
import { protocolClient } from '@/lib/protocol/client';
import { useWallet } from '@/components/web3/WalletContext';
import { AGREEMENTS_QUERY_KEY } from '@/hooks/useAgreement';
import { DoneLogo } from './DoneLogo';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Check, ArrowRight, ShieldCheck, Plus, Sparkles, Layers, Lock } from 'lucide-react';
import { formatUsdc } from '@/lib/solana';

interface CreateAgreementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (agreementKey: string) => void;
}

const TEMPLATES = [
  {
    name: 'Smart Contract Audit',
    title: 'Solana Program Security Audit',
    terms: 'Comprehensive vulnerability assessment and fuzz test verification.',
    budget: 8_000_000_000,
    milestones: [
      { title: 'Threat Modeling & Invariant Check', amount: 3_000_000_000, dod: ['Threat model document', 'Slither / cargo audit run'] },
      { title: 'Final Remediation & Audit Report', amount: 5_000_000_000, dod: ['Executive summary signed', 'Remediation PR verified'] },
    ],
  },
  {
    name: 'Full-Stack Web3 App',
    title: 'Escrow DApp Frontend & Integration',
    terms: 'Responsive web application with Solana wallet adapter and anchor bindings.',
    budget: 5_000_000_000,
    milestones: [
      { title: 'UI Implementation & Design System', amount: 2_500_000_000, dod: ['Figma design implemented', 'Dark mode with violet accent'] },
      { title: 'On-Chain Integration & Release', amount: 2_500_000_000, dod: ['Devnet transactions confirmed', 'PR merged to main'] },
    ],
  },
  {
    name: 'Indexer & Backend',
    title: 'Solana RPC Event Streaming Pipeline',
    terms: 'Geyser indexer pipeline with database ingestion and GraphQL API.',
    budget: 6_000_000_000,
    milestones: [
      { title: 'Indexer Ingestion Engine', amount: 3_000_000_000, dod: ['Zero dropped slots in 24h', 'Postgres migrations applied'] },
      { title: 'API Queries & Load Test', amount: 3_000_000_000, dod: ['GraphQL query endpoints', 'k6 stress test p95 < 50ms'] },
    ],
  },
];

export function CreateAgreementDrawer({ isOpen, onClose, onSuccess }: CreateAgreementDrawerProps) {
  const queryClient = useQueryClient();
  const { publicKey, publicKeyString } = useWallet();

  const [step, setStep] = useState<1 | 2>(1); // 1 = Details & Milestones, 2 = Confirm & Authorize
  const [title, setTitle] = useState('Protocol Engineering Milestone');
  const [workerAddress, setWorkerAddress] = useState('');
  const [termsText, setTermsText] = useState('Standard verified escrow deliverables under DONE Protocol.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [milestones, setMilestones] = useState<Array<{ title: string; amountUsdc: number; dodCriteria: string[] }>>([
    {
      title: 'Phase 1: Architecture & Deliverable Spec',
      amountUsdc: 2_500_000_000,
      dodCriteria: ['Architecture RFC approved', 'Test matrix passed'],
    },
    {
      title: 'Phase 2: Final Verification & Production Deployment',
      amountUsdc: 2_500_000_000,
      dodCriteria: ['Production build signed', 'Final verification criteria met'],
    },
  ]);

  if (!isOpen) return null;

  const totalBudget = milestones.reduce((sum, m) => sum + m.amountUsdc, 0);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTitle(tpl.title);
    setTermsText(tpl.terms);
    setMilestones(
      tpl.milestones.map((m) => ({
        title: m.title,
        amountUsdc: m.amount,
        dodCriteria: m.dod,
      }))
    );
  };

  const handleCreate = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    let workerPubkey: PublicKey;
    try {
      if (workerAddress.trim()) {
        workerPubkey = new PublicKey(workerAddress.trim());
      } else if (publicKey) {
        workerPubkey = publicKey;
      } else {
        workerPubkey = new PublicKey('11111111111111111111111111111111');
      }
    } catch {
      setError('Invalid Worker Solana address format');
      return;
    }

    setIsSubmitting(true);
    try {
      const termsHash = await hashAgreementTerms(termsText);
      const { agreementPda } = await protocolClient.createAgreement({
        sponsor: publicKey || undefined,
        worker: workerPubkey,
        termsHash,
        milestoneCount: milestones.length,
        title,
        description: termsText,
        termsText,
      });

      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        const dodHash = await hashDoDCriteria(m.dodCriteria);
        await protocolClient.createMilestone({
          agreement: agreementPda,
          index: i,
          amount: m.amountUsdc,
          dodHash,
          verificationType: VerificationType.SPONSOR,
          title: m.title,
          description: m.title,
          dodCriteria: m.dodCriteria,
        });
      }

      await queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
      onClose();
      if (onSuccess) {
        onSuccess(agreementPda.toBase58());
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Failed to create agreement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono text-neutral-100">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 md:inset-x-auto md:right-0 md:top-0 md:h-full w-full md:w-[540px] bg-[#0a0a0c] border-t md:border-t-0 md:border-l border-[#26262a] rounded-t-3xl md:rounded-none z-50 max-h-[92vh] md:max-h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
        {/* Header with Done Logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#26262a] bg-[#0d0d0f]">
          <div className="flex items-center gap-3">
            <DoneLogo className="w-7 h-7" />
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Create Escrow Agreement
                <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-semibold">
                  LIVE
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">Step {step} of 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#1a1a1e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Presets */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block mb-2">
                  Quick Templates
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => applyTemplate(tpl)}
                      className="px-2.5 py-2 rounded-xl bg-[#141416] hover:bg-violet-950/30 hover:border-violet-500/40 border border-[#26262a] text-left transition-colors text-[11px]"
                    >
                      <span className="font-semibold text-white block truncate">{tpl.name}</span>
                      <span className="text-violet-400 text-[10px]">${formatUsdc(tpl.budget)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold block mb-1.5">
                  Agreement Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Audit Assessment"
                  className="bg-[#141416] border-[#26262a] text-sm"
                />
              </div>

              {/* Worker Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold">
                    Worker / Beneficiary Address
                  </label>
                  {publicKeyString && (
                    <button
                      type="button"
                      onClick={() => setWorkerAddress(publicKeyString)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 underline"
                    >
                      Use my address
                    </button>
                  )}
                </div>
                <Input
                  value={workerAddress}
                  onChange={(e) => setWorkerAddress(e.target.value)}
                  placeholder={publicKeyString ? `Default: ${publicKeyString.slice(0, 12)}...` : 'Solana PublicKey (base58)'}
                  className="bg-[#141416] border-[#26262a] text-xs font-mono"
                />
              </div>

              {/* Milestones */}
              <div className="space-y-3 pt-2 border-t border-[#26262a]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    Milestones ({milestones.length})
                  </span>
                  {milestones.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones([
                          ...milestones,
                          {
                            title: `Milestone #${milestones.length + 1}`,
                            amountUsdc: 1_000_000_000,
                            dodCriteria: ['Standard deliverable review'],
                          },
                        ])
                      }
                      className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="p-3 bg-[#141416] rounded-xl border border-[#26262a] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-violet-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => {
                            const updated = [...milestones];
                            updated[idx].title = e.target.value;
                            setMilestones(updated);
                          }}
                          className="flex-1 bg-transparent border-b border-[#26262a] focus:border-violet-500 text-xs text-white pb-0.5 outline-none"
                        />
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-neutral-500">$</span>
                          <input
                            type="number"
                            value={m.amountUsdc / 1e6}
                            onChange={(e) => {
                              const updated = [...milestones];
                              const val = parseFloat(e.target.value) || 0;
                              updated[idx].amountUsdc = Math.round(val * 1e6);
                              setMilestones(updated);
                            }}
                            className="w-16 bg-[#0d0d0f] border border-[#26262a] rounded px-1.5 py-0.5 text-right font-semibold text-white text-xs outline-none focus:border-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs">
                  <span className="text-neutral-300">Total Escrow Value:</span>
                  <span className="text-base font-bold text-violet-300">${formatUsdc(totalBudget)} USDC</span>
                </div>
              </div>
            </>
          ) : (
            /* Step 2: Confirm & Authorize */
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#141416] border border-[#26262a] text-center">
                <DoneLogo className="w-14 h-14 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">{title}</h3>
                <p className="text-xs text-neutral-400 mb-3">{milestones.length} Milestones • Deterministic Payouts</p>
                <div className="text-2xl font-black text-violet-400 mb-1">${formatUsdc(totalBudget)} USDC</div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Locked Value upon funding</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#141416] border border-[#26262a]">
                  <span className="text-neutral-400">Sponsor:</span>
                  <span className="text-violet-300 font-mono text-[11px]">
                    {publicKeyString ? `${publicKeyString.slice(0, 10)}...${publicKeyString.slice(-6)}` : 'Connected Wallet'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#141416] border border-[#26262a]">
                  <span className="text-neutral-400">Beneficiary:</span>
                  <span className="text-violet-300 font-mono text-[11px]">
                    {workerAddress ? `${workerAddress.slice(0, 10)}...${workerAddress.slice(-6)}` : 'Active Wallet'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#141416] border border-[#26262a]">
                  <span className="text-neutral-400">Escrow Security:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Non-Custodial Vault PDA
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-[#26262a] bg-[#0d0d0f] flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                className="flex items-center gap-2"
              >
                Review & Confirm <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Back
              </button>
              <Button
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleCreate}
                className="flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Authorize & Deploy Escrow
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
