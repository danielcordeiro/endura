'use client';

import { cn } from '@/lib/utils';

interface ActivityRowProps {
  title: string;
  discipline: string;
  date: string;
  duration: string;
  distance?: string;
  hasNutrition: boolean;
  onClick?: () => void;
  className?: string;
}

const iconMap: Record<string, string> = {
  swim: 'pool',
  bike: 'directions_bike',
  run: 'directions_run',
  brick: 'bolt',
};

const colorMap: Record<string, { bg: string; text: string }> = {
  swim: { bg: 'bg-swim/20', text: 'text-swim' },
  bike: { bg: 'bg-bike/20', text: 'text-bike' },
  run: { bg: 'bg-run/20', text: 'text-run' },
  brick: { bg: 'bg-brick/20', text: 'text-brick' },
};

const defaultColors = { bg: 'bg-text-faint/20', text: 'text-text-muted' };

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
  const colors = colorMap[discipline] ?? defaultColors;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 w-full text-left p-4 rounded-2xl',
        'bg-bg-surface border border-border',
        'hover:border-primary/30 transition-all duration-150',
        'active:scale-[0.98]',
        className,
      )}
    >
      {/* Icon */}
      <div className={cn('flex items-center justify-center w-12 h-12 rounded-full shrink-0', colors.bg, colors.text)}>
        <span className="material-symbols-outlined">{iconMap[discipline] ?? 'exercise'}</span>
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
            <span className="text-xs text-text-secondary">{duration}</span>
          </div>
        </div>
        <div className="flex items-center mt-1 gap-2">
          <span className="text-xs text-text-secondary">{date}</span>
          {hasNutrition && (
            <div className="flex items-center gap-1 pl-2 border-l border-border-strong">
              <span className="material-symbols-outlined text-[14px] text-success">nutrition</span>
              <span className="text-[10px] font-medium text-success uppercase tracking-wide">Nutrição</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
