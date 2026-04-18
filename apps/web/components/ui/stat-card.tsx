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
        'bg-bg-surface rounded-2xl ring-1 ring-white/5 p-5 flex flex-col gap-3 min-w-0 transition-colors hover:ring-white/10',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-[0.08em]">
        {icon && <span className="material-symbols-outlined text-base leading-none">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white font-[var(--font-mono)] truncate leading-none">
        {value}
        {unit && <span className="text-base text-slate-500 font-normal ml-1">{unit}</span>}
      </div>
      {context && (
        <div className="text-xs text-slate-500 mt-auto truncate">{context}</div>
      )}
      {children && <div className="mt-auto">{children}</div>}
    </div>
  );
}
