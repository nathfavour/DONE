'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { VerificationType } from '@/types/protocol';
import { hashAgreementTerms, hashDoDCriteria } from '@/lib/protocol/hashing';
import { formatUsdc } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  ShieldCheck,
  ArrowRight,
  Plus,
  Trash2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function CreateAgreementPage() {
  const router = useRouter();
  const { publicKey, publicKeyString } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [title, setTitle] = useState('Protocol Milestone Agreement');
  const [workerAddress, setWorkerAddress] = useState('');
  const [termsText, setTermsText] = useState('Standard milestone deliverables under DONE Protocol.');
  const [milestones, setMilestones] = useState([
    { title: 'Milestone 1: Deliverable Build', amount: 2500, dod: ['Verified test suite', 'PR merged'] },
    { title: 'Milestone 2: Production Release', amount: 2500, dod: ['Live deployment', 'Sign-off'] },
  ]);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);

  const handleSubmit = async () => {
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
      setError('Invalid Worker Solana address');
      return;
    }

    try {
      await execute('createAgreement', 'Deploy Escrow and Derive Vault PDA', async () => {
        const termsHash = await hashAgreementTerms(termsText);
        const { signature, agreementPda } = await protocolClient.createAgreement({
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
          const dodHash = await hashDoDCriteria(m.dod);
          await protocolClient.createMilestone({
            agreement: agreementPda,
            index: i,
            amount: Math.round(m.amount * 1e6),
            dodHash,
            verificationType: VerificationType.SPONSOR,
            title: m.title,
            description: m.title,
            dodCriteria: m.dod,
          });
        }

        router.push(`/agreements/${agreementPda.toBase58()}`);
        return { signature, agreementPda };
      });
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-mono text-neutral-100">
      <TxStateModal
        isOpen={isTxOpen}
        state={txState}
        onClose={resetTx}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#26262a] pb-4">
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold text-white">Create Escrow Agreement</h1>
            <p className="text-xs text-neutral-400">Step {step} of 2</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {step === 1 ? (
        <Card className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5 uppercase">
              Agreement Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audit Assessment"
            />
          </div>

          {/* Worker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase">
                Worker Solana Address
              </label>
              {publicKeyString && (
                <button
                  type="button"
                  onClick={() => setWorkerAddress(publicKeyString)}
                  className="text-[11px] text-violet-400 hover:underline"
                >
                  Use my address
                </button>
              )}
            </div>
            <Input
              value={workerAddress}
              onChange={(e) => setWorkerAddress(e.target.value)}
              placeholder={publicKeyString || 'Base58 Solana PublicKey'}
              className="font-mono text-xs"
            />
          </div>

          {/* Milestones */}
          <div className="space-y-3 pt-2 border-t border-[#26262a]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-300">
                Milestones ({milestones.length})
              </span>
              {milestones.length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    setMilestones([
                      ...milestones,
                      { title: `Milestone ${milestones.length + 1}`, amount: 1000, dod: ['Deliverable approval'] },
                    ])
                  }
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Milestone
                </button>
              )}
            </div>

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div key={idx} className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
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
                        value={m.amount}
                        onChange={(e) => {
                          const updated = [...milestones];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setMilestones(updated);
                        }}
                        className="w-16 bg-[#000000] border border-[#26262a] rounded px-1.5 py-0.5 text-right font-semibold text-white text-xs outline-none"
                      />
                      <span className="text-neutral-500 text-[10px]">USDC</span>
                    </div>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}
                        className="text-neutral-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs">
              <span className="text-neutral-300">Total Escrow Budget:</span>
              <span className="text-sm font-bold text-violet-300">${formatUsdc(totalAmount * 1e6)} USDC</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={() => setStep(2)} className="flex items-center gap-2">
              Review Escrow <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        /* Step 2: Confirm */
        <Card className="space-y-5 text-xs">
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#000000] border border-[#26262a] text-center space-y-2">
            <DoneLogo className="w-12 h-12" />
            <h3 className="text-base font-bold text-white">{title}</h3>
            <div className="text-2xl font-black text-violet-400">${formatUsdc(totalAmount * 1e6)} USDC</div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{milestones.length} Milestones</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between p-3 rounded-xl bg-[#000000] border border-[#26262a]">
              <span className="text-neutral-400">Sponsor:</span>
              <span className="text-violet-300 font-mono text-[11px]">
                {publicKeyString ? `${publicKeyString.slice(0, 10)}...` : 'Connected Wallet'}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-[#000000] border border-[#26262a]">
              <span className="text-neutral-400">Worker:</span>
              <span className="text-violet-300 font-mono text-[11px]">
                {workerAddress ? `${workerAddress.slice(0, 10)}...` : 'Active Wallet'}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-[#000000] border border-[#26262a]">
              <span className="text-neutral-400">Security:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Non-Custodial Vault PDA
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#26262a]">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={handleSubmit} className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Authorize & Deploy Escrow
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
