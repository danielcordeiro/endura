'use client';

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

const iconMap: Record<Discipline, string> = {
  swim: 'pool',
  bike: 'directions_bike',
  run: 'directions_run',
  brick: 'bolt',
};

const colorMap: Record<Discipline, { bg: string; text: string }> = {
  swim: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  bike: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  run: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  brick: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
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
  const colors = colorMap[discipline];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 w-full text-left p-4 rounded-2xl',
        'bg-bg-surface border border-slate-800/50',
        'hover:border-primary/30 transition-all duration-150',
        'active:scale-[0.98]',
        className,
      )}
    >
      {/* Icon */}
      <div className={cn('flex items-center justify-center w-12 h-12 rounded-full shrink-0', colors.bg, colors.text)}>
        <span className="material-symbols-outlined">{iconMap[discipline]}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white truncate pr-2">{title}</h3>
          <div className="flex flex-col items-end shrink-0">
            {distance && (
              <span className="text-sm font-bold text-white">
                {distance}
              </span>
            )}
            <span className="text-xs text-slate-400">{duration}</span>
          </div>
        </div>
        <div className="flex items-center mt-1 gap-2">
          <span className="text-xs text-slate-400">{date}</span>
          {hasNutrition && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
              <span className="material-symbols-outlined text-[14px] text-green-500">nutrition</span>
              <span className="text-[10px] font-medium text-green-400 uppercase tracking-wide">Nutrição</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
