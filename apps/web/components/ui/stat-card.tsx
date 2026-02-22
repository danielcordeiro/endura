'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  context?: string;
  icon?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StatCard({ label, value, unit, context, icon, className, children }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-bg-surface rounded-3xl border border-slate-800/50 p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
        {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
        {label}
      </div>
      <div className="text-2xl font-bold text-white font-[var(--font-mono)]">
        {value}
        {unit && <span className="text-lg text-slate-500 font-normal ml-0.5">{unit}</span>}
      </div>
      {context && (
        <div className="text-xs text-slate-500 mt-auto">{context}</div>
      )}
      {children && <div className="mt-auto">{children}</div>}
    </div>
  );
}
