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
} from 'lucide-react';

interface MilestoneDraft {
  title: string;
  description: string;
  amountUsdcString: string;
  verificationType: VerificationType;
  criteria: string[];
  computedDodHash: string;
}

export default function NewAgreementPage() {
  const router = useRouter();
  const { txState, execute, reset, isOpen } = useTransactionExecution();

  // Step 1: Sponsor & Agreement Terms
  const [workerPubkey, setWorkerPubkey] = useState(DEMO_KEYS.WORKER);
  const [title, setTitle] = useState('Rust Anchor Smart Contract Audit');
  const [description, setDescription] = useState(
    'Comprehensive security review and invariant testing of protocol escrow vaults.'
  );
  const [termsText, setTermsText] = useState(
    '1. All milestones must strictly satisfy committed Definition of Done criteria.\n2. Work artifacts must be permanently stored on Arweave or IPFS.\n3. Disbursals are final upon block confirmation.'
  );
  const [computedTermsHash, setComputedTermsHash] = useState('');

  // Step 2: Milestones
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      title: 'Threat Modeling & Static Verification',
      description: 'Architecture threat modeling and cargo-audit Slither reports.',
      amountUsdcString: '4000',
      verificationType: VerificationType.SPONSOR,
      criteria: [
        'Architecture threat model document covering all CPI call paths',
        'Automated cargo-audit report with zero unaddressed high-risk alerts',
      ],
      computedDodHash: '',
    },
    {
      title: 'Trident Invariant Fuzzing & Review',
      description: 'Trident fuzz test suite verifying solvency and PDA safety.',
      amountUsdcString: '6000',
      verificationType: VerificationType.SPONSOR,
      criteria: [
        'Trident fuzzing test suite run for minimum 10,000,000 iterations',
        'Pull request merged into target protocol repository test tree',
      ],
      computedDodHash: '',
    },
  ]);

  // Compute terms hash whenever terms change
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

  const criteriaSignature = JSON.stringify(milestones.map((m) => m.criteria));

  // Compute DoD hashes for milestones
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
        title: `Milestone ${milestones.length}: New Deliverable`,
        description: 'Provide deliverable description...',
        amountUsdcString: '2500',
        verificationType: VerificationType.SPONSOR,
        criteria: ['Criterion 1 requirement', 'Criterion 2 validation'],
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

  const addCriterion = (mIdx: number) => {
    const next = [...milestones];
    next[mIdx].criteria.push('');
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

  const totalBudgetUsdc = milestones.reduce((sum, m) => sum + (parseFloat(m.amountUsdcString) || 0), 0);

  const handleCreateAgreement = async () => {
    try {
      new PublicKey(workerPubkey);
    } catch {
      alert('Invalid Solana Worker Public Key format');
      return;
    }

    const termsBuffer = await hashAgreementTerms({ title, description, termsText });

    const result = await execute(
      'createAgreement',
      `Initializing Agreement PDA with worker ${truncateAddress(workerPubkey, 4)} and ${milestones.length} milestones`,
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
      }, 1000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-neutral-100">
      <TxStateModal state={txState} isOpen={isOpen} onClose={reset} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>INITIALIZATION WIZARD</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Create Verifiable Agreement
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick presets */}
          <button
            type="button"
            onClick={() => {
              setTitle('Rust Anchor Smart Contract Audit');
              setDescription('Security review and invariant fuzz testing of protocol vaults.');
              setWorkerPubkey(DEMO_KEYS.WORKER);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141416] hover:bg-[#1a1a1e] border border-[#26262a] rounded-xl text-xs text-cyan-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preset: Security Audit</span>
          </button>
        </div>
      </div>

      {/* 3.3 Sponsor Step Card (rounded-2xl, #0d0d0f) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#141416] border border-[#202024] flex items-center justify-center text-xs font-bold text-neutral-200">
              1
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Sponsor Specifications & Scope
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">PARAMETERS</span>
        </div>

        <div className="space-y-4">
          <Input
            label="WORKER SOLANA PUBLIC KEY"
            helperText="The base58 keypair authorized to execute work and claim released USDC."
            value={workerPubkey}
            onChange={(e) => setWorkerPubkey(e.target.value)}
            required
          />

          <Input
            label="AGREEMENT TITLE"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="HIGH-LEVEL PROJECT SPECIFICATIONS & SCOPE"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Textarea
            label="TERMS & PROVISIONS (CANONICAL COMMITMENT PRE-IMAGE)"
            rows={3}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            required
          />

          {/* Canonical Terms Hash Preview */}
          <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase font-bold mb-1">
              <Hash className="w-3 h-3 text-cyan-400" />
              CANONICAL SHA-256 TERMS COMMITMENT:
            </div>
            <div className="text-xs text-cyan-300 font-mono break-all">{computedTermsHash}</div>
          </div>
        </div>
      </Card>

      {/* 3.3 Milestone Builder Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#141416] border border-[#202024] flex items-center justify-center text-xs font-bold text-neutral-200">
              2
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Milestone Builder ({milestones.length})
            </h3>
          </div>
          <Button variant="secondary" size="sm" onClick={addMilestone}>
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Add Milestone
          </Button>
        </div>

        {milestones.map((m, mIdx) => (
          <div
            key={mIdx}
            className="p-5 bg-[#0d0d0f] border border-[#26262a] rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-[#141416] border border-[#202024] text-xs font-bold text-neutral-300">
                  MILESTONE #{mIdx}
                </span>
                <span className="text-xs font-semibold text-white">{m.title}</span>
              </div>
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(mIdx)}
                  className="text-neutral-500 hover:text-red-400 text-xs inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="MILESTONE TITLE"
                  value={m.title}
                  onChange={(e) => updateMilestone(mIdx, { title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Input
                  label="ALLOCATED AMOUNT (USDC)"
                  type="number"
                  min="1"
                  step="1"
                  value={m.amountUsdcString}
                  onChange={(e) => updateMilestone(mIdx, { amountUsdcString: e.target.value })}
                  required
                />
              </div>
            </div>

            <Textarea
              label="MILESTONE OBJECTIVE"
              rows={2}
              value={m.description}
              onChange={(e) => updateMilestone(mIdx, { description: e.target.value })}
              required
            />

            {/* Verification Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 uppercase tracking-wide">
                VERIFICATION MODE
              </label>
              <select
                value={m.verificationType}
                onChange={(e) =>
                  updateMilestone(mIdx, { verificationType: Number(e.target.value) })
                }
                className="w-full bg-[#141416] border border-[#26262a] px-3.5 py-2.5 text-xs text-neutral-100 rounded-xl focus:outline-none focus:border-neutral-400"
              >
                <option value={VerificationType.SPONSOR}>Sponsor Approval</option>
                <option value={VerificationType.ON_CHAIN_ORACLE}>On-Chain Condition / Oracle</option>
                <option value={VerificationType.ATTESTATION}>Attestation (EAS / Precompile)</option>
              </select>
            </div>

            {/* Definition of Done Checklist */}
            <div className="space-y-2 pt-2 border-t border-[#26262a]">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  DEFINITION OF DONE CHECKLIST ({m.criteria.length})
                </label>
                <button
                  type="button"
                  onClick={() => addCriterion(mIdx)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" /> Add Item
                </button>
              </div>

              <div className="space-y-2">
                {m.criteria.map((crit, cIdx) => (
                  <div key={cIdx} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-neutral-500 w-5">[{cIdx + 1}]</span>
                    <Input
                      value={crit}
                      onChange={(e) => updateCriterion(mIdx, cIdx, e.target.value)}
                      placeholder="Verifiable completion requirement..."
                    />
                    {m.criteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriterion(mIdx, cIdx)}
                        className="p-2 text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Canonical Commitment Preview */}
            <div className="p-3 bg-[#141416] border border-[#202024] rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase font-bold mb-0.5">
                <Hash className="w-3 h-3 text-cyan-400" />
                CANONICAL DoD SHA-256 HASH (NORMALIZED & SORTED):
              </div>
              <div className="text-[11px] text-amber-400 font-mono break-all">
                {m.computedDodHash || 'Hashing...'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3.3 Action Bar */}
      <div className="p-5 bg-[#0d0d0f] border border-[#26262a] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-neutral-400 text-xs uppercase block">TOTAL ESCROW BUDGET</span>
          <div className="text-2xl font-bold text-white">
            ${totalBudgetUsdc.toLocaleString()} <span className="text-xs text-neutral-400">USDC</span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {milestones.length} Milestones committed to Solana Devnet
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => router.push('/agreements')}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleCreateAgreement}>
            <span>Initialize Agreement & Fund Escrow</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
