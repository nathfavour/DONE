import React from 'react';
import { MilestoneState } from '@/types/protocol';
import { Check } from 'lucide-react';

export function PipelineProgress({ state }: { state: MilestoneState }) {
  const steps = [
    {
      id: 'dod',
      short: 'DoD Committed',
      completed: true,
      current: state === MilestoneState.PENDING,
    },
    {
      id: 'evidence',
      short: 'Evidence Proof',
      completed:
        state === MilestoneState.EVIDENCE_SUBMITTED ||
        state === MilestoneState.VERIFIED ||
        state === MilestoneState.RELEASED,
      current: state === MilestoneState.EVIDENCE_SUBMITTED,
    },
    {
      id: 'verification',
      short: 'DoD Verified',
      completed: state === MilestoneState.VERIFIED || state === MilestoneState.RELEASED,
      current: state === MilestoneState.VERIFIED,
    },
    {
      id: 'settlement',
      short: 'USDC Released',
      completed: state === MilestoneState.RELEASED,
      current: false,
    },
  ];

  return (
    <div className="w-full font-mono text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((step, idx) => {
          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                step.completed
                  ? 'bg-[#141416] border-emerald-500/30 text-emerald-400'
                  : step.current
                  ? 'bg-[#141416] border-white text-white shadow-sm'
                  : 'bg-[#0d0d0f] border-[#26262a] text-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                  STAGE {idx + 1}
                </span>
                {step.completed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {step.current && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              </div>
              <p className="font-semibold text-xs truncate">{step.short}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
