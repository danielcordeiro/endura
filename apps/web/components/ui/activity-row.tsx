'use client';

import { Waves, Bike, Footprints, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Discipline = 'swim' | 'bike' | 'run' | 'brick';

interface ActivityRowProps {
  title: string;
  discipline: Discipline;
  date: string;
  duration: string;
  distance?: string;
  hasNutrition: boolean;
  onClick?: () => void;
  className?: string;
}

const iconMap: Record<Discipline, typeof Waves> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  brick: Zap,
};

const colorMap: Record<Discipline, string> = {
  swim: 'text-swim bg-swim/15',
  bike: 'text-bike bg-bike/15',
  run: 'text-run bg-run/15',
  brick: 'text-brick bg-brick/15',
};

export function ActivityRow({
  title,
  discipline,
  date,
  duration,
  distance,
  hasNutrition,
  onClick,
  className,
}: ActivityRowProps) {
  const Icon = iconMap[discipline];
  const colors = colorMap[discipline];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full text-left p-3 rounded-lg',
        'bg-bg-surface border border-border',
        'hover:bg-bg-elevated transition-colors duration-150',
        'active:scale-[0.99]',
        className,
      )}
    >
      {/* Icon */}
      <div className={cn('flex items-center justify-center w-10 h-10 rounded-full shrink-0', colors)}>
        <Icon size={20} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-[15px] text-text-primary truncate">{title}</p>
        <p className="font-body text-[12px] text-text-secondary mt-0.5">
          {date} · {duration}{distance ? ` · ${distance}` : ''}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              hasNutrition ? 'bg-success' : 'bg-text-muted',
            )}
          />
          <span className="font-body text-[11px] text-text-muted">
            {hasNutrition ? 'Nutricao registrada' : 'Sem nutricao'}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-muted shrink-0">
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
