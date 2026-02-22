'use client';

import { cn } from '@/lib/utils';

type Discipline = 'swim' | 'bike' | 'run' | 'brick';

interface DisciplineBadgeProps {
  discipline: Discipline;
  size?: 'sm' | 'md';
  className?: string;
}

const config: Record<Discipline, { label: string; icon: string; colorClass: string; bgClass: string }> = {
  swim: { label: 'SWIM', icon: 'pool', colorClass: 'text-swim', bgClass: 'bg-swim/20' },
  bike: { label: 'BIKE', icon: 'directions_bike', colorClass: 'text-bike', bgClass: 'bg-bike/20' },
  run: { label: 'RUN', icon: 'directions_run', colorClass: 'text-run', bgClass: 'bg-run/20' },
  brick: { label: 'BRICK', icon: 'bolt', colorClass: 'text-brick', bgClass: 'bg-brick/20' },
};

export function DisciplineBadge({ discipline, size = 'sm', className }: DisciplineBadgeProps) {
  const { label, icon, colorClass, bgClass } = config[discipline];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        'text-[11px] font-bold uppercase tracking-wider',
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5',
        bgClass,
        colorClass,
        `border-${discipline}/30`,
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
