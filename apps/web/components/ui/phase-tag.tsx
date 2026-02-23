'use client';

import { cn } from '@/lib/utils';

type Phase = 'pre' | 'during' | 'post';

interface PhaseTagProps {
  phase: Phase;
  className?: string;
}

const phaseConfig: Record<Phase, { label: string; colorClass: string; bgClass: string }> = {
  pre: { label: 'PRE', colorClass: 'text-phase-pre', bgClass: 'bg-phase-pre/15' },
  during: { label: 'DURANTE', colorClass: 'text-phase-during', bgClass: 'bg-phase-during/15' },
  post: { label: 'PÓS', colorClass: 'text-phase-post', bgClass: 'bg-phase-post/15' },
};

export function PhaseTag({ phase, className }: PhaseTagProps) {
  const { label, colorClass, bgClass } = phaseConfig[phase];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1',
        'text-[11px] font-bold uppercase tracking-widest',
        bgClass,
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}

/* ── Segmented Phase Toggle ── */

interface PhaseToggleProps {
  value: Phase;
  onChange: (phase: Phase) => void;
  className?: string;
}

const phases: { value: Phase; label: string }[] = [
  { value: 'pre', label: 'PRE' },
  { value: 'during', label: 'DURANTE' },
  { value: 'post', label: 'PÓS' },
];

export function PhaseToggle({ value, onChange, className }: PhaseToggleProps) {
  return (
    <div className={cn('bg-bg-surface border border-slate-700/50 p-1.5 rounded-full flex', className)}>
      {phases.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-all',
            value === opt.value
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-400 hover:text-white',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
