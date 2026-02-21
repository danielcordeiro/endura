'use client';

import { cn } from '@/lib/utils';

type StatCardVariant = 'default' | 'highlight' | 'warn' | 'danger';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  context?: string;
  variant?: StatCardVariant;
  className?: string;
}

const variantBorder: Record<StatCardVariant, string> = {
  default: '',
  highlight: 'border-l-3 border-l-primary',
  warn: 'border-l-3 border-l-warning',
  danger: 'border-l-3 border-l-danger',
};

export function StatCard({ label, value, unit, context, variant = 'default', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-bg-surface border border-border rounded-lg p-4',
        'transition-transform duration-150 ease-out hover:scale-[1.02] hover:brightness-105',
        variantBorder[variant],
        className,
      )}
    >
      <p className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </p>
      <p className="font-mono font-bold text-[32px] leading-tight text-text-primary mt-1">
        {value}
      </p>
      {(unit || context) && (
        <p className="font-body text-[12px] text-text-muted mt-0.5">
          {unit}{unit && context ? ' · ' : ''}{context}
        </p>
      )}
    </div>
  );
}
