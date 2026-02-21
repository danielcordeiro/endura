'use client';

import { Waves, Bike, Footprints, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Discipline = 'swim' | 'bike' | 'run' | 'brick';

interface DisciplineBadgeProps {
  discipline: Discipline;
  size?: 'sm' | 'md';
  className?: string;
}

const config: Record<Discipline, { label: string; icon: typeof Waves; colorClass: string; bgClass: string }> = {
  swim: { label: 'SWIM', icon: Waves, colorClass: 'text-swim', bgClass: 'bg-swim/15' },
  bike: { label: 'BIKE', icon: Bike, colorClass: 'text-bike', bgClass: 'bg-bike/15' },
  run: { label: 'RUN', icon: Footprints, colorClass: 'text-run', bgClass: 'bg-run/15' },
  brick: { label: 'BRICK', icon: Zap, colorClass: 'text-brick', bgClass: 'bg-brick/15' },
};

export function DisciplineBadge({ discipline, size = 'sm', className }: DisciplineBadgeProps) {
  const { label, icon: Icon, colorClass, bgClass } = config[discipline];
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        'font-body text-[11px] font-medium uppercase tracking-[0.08em]',
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5',
        bgClass,
        colorClass,
        className,
      )}
    >
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
