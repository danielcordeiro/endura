'use client';

import { cn } from '@/lib/utils';

type Discipline = 'swim' | 'bike' | 'run' | 'brick' | 'other';

interface DisciplineBadgeProps {
  discipline: string;
  size?: 'sm' | 'md';
  className?: string;
}

// Classes precisam ser literais no codigo para nao serem purgadas pelo Tailwind.
const config: Record<Discipline, { label: string; icon: string; colorClass: string; bgClass: string; borderClass: string }> = {
  swim:  { label: 'SWIM',  icon: 'pool',            colorClass: 'text-swim',     bgClass: 'bg-swim/20',         borderClass: 'border-swim/30' },
  bike:  { label: 'BIKE',  icon: 'directions_bike', colorClass: 'text-bike',     bgClass: 'bg-bike/20',         borderClass: 'border-bike/30' },
  run:   { label: 'RUN',   icon: 'directions_run',  colorClass: 'text-run',      bgClass: 'bg-run/20',          borderClass: 'border-run/30' },
  brick: { label: 'BRICK', icon: 'bolt',            colorClass: 'text-brick',    bgClass: 'bg-brick/20',        borderClass: 'border-brick/30' },
  other: { label: 'OUTRO', icon: 'fitness_center',  colorClass: 'text-text-secondary', bgClass: 'bg-text-muted/20',   borderClass: 'border-text-muted/30' },
};

export function DisciplineBadge({ discipline, size = 'sm', className }: DisciplineBadgeProps) {
  const key: Discipline = (discipline in config ? discipline : 'other') as Discipline;
  const { label, icon, colorClass, bgClass, borderClass } = config[key];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        'text-[11px] font-bold uppercase tracking-wider',
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5',
        bgClass,
        colorClass,
        borderClass,
        className,
      )}
    >
      <span className={cn('material-symbols-outlined', size === 'sm' ? 'text-sm' : 'text-lg')}>
        {icon}
      </span>
      {label}
    </span>
  );
}
