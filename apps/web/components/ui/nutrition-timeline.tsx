'use client';

import { cn } from '@/lib/utils';

interface TimelineItem {
  phase: 'pre' | 'during' | 'post';
  minuteOffset: number;
  product: string;
  detail?: string;
}

interface NutritionTimelineProps {
  items: TimelineItem[];
  className?: string;
}

const phaseColor: Record<string, string> = {
  pre: 'bg-phase-pre',
  during: 'bg-phase-during',
  post: 'bg-phase-post',
};

function formatOffset(minutes: number): string {
  if (minutes === 0) return '0\'';
  const sign = minutes > 0 ? '+' : '';
  if (Math.abs(minutes) >= 60) {
    const h = Math.floor(Math.abs(minutes) / 60);
    const m = Math.abs(minutes) % 60;
    return `${sign}${minutes < 0 ? '-' : ''}${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
  }
  return `${sign}${minutes}'`;
}

export function NutritionTimeline({ items, className }: NutritionTimelineProps) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.minuteOffset - b.minuteOffset);

  return (
    <div className={cn('relative', className)}>
      {/* Phase labels */}
      <div className="flex justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-phase-pre">PRE</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-phase-during">DURANTE</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-phase-post">PÓS</span>
      </div>

      {/* Timeline line */}
      <div className="relative h-px bg-slate-700/50 my-3">
        {/* Dots */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {sorted.map((item, i) => (
            <div
              key={i}
              className={cn('w-3 h-3 rounded-full -mt-px ring-2 ring-[#101a22]', phaseColor[item.phase])}
              style={{
                position: 'absolute',
                left: `${((i) / Math.max(sorted.length - 1, 1)) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Labels below */}
      <div className="relative flex justify-between mt-1" style={{ minHeight: 40 }}>
        {sorted.map((item, i) => (
          <div
            key={i}
            className="text-center"
            style={{
              position: 'absolute',
              left: `${((i) / Math.max(sorted.length - 1, 1)) * 100}%`,
              transform: 'translateX(-50%)',
              maxWidth: 80,
            }}
          >
            <p className="font-[var(--font-mono)] text-[11px] text-slate-500">{formatOffset(item.minuteOffset)}</p>
            <p className="text-[11px] text-slate-400 truncate">{item.product}</p>
            {item.detail && (
              <p className="text-[10px] text-slate-500 truncate">{item.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
