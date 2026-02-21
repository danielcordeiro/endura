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
  post: { label: 'POS', colorClass: 'text-phase-post', bgClass: 'bg-phase-post/15' },
};

export function PhaseTag({ phase, className }: PhaseTagProps) {
  const { label, colorClass, bgClass } = phaseConfig[phase];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1',
        'font-body text-[11px] font-medium uppercase tracking-[0.08em]',
        bgClass,
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
