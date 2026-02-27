'use client';

import { cn } from '@/lib/utils';

interface PlanPhase {
  discipline: string;
  durationMin: number;
  items: Array<{
    productName: string;
    minuteOffset?: number;
    quantity?: number;
    unit?: string;
    carbsG?: number;
    sodiumMg?: number;
  }>;
}

interface RacePlanTimelineProps {
  phases: PlanPhase[];
  className?: string;
}

const disciplineConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  swim: { color: 'text-swim', bg: 'bg-swim/20', icon: 'pool', label: 'Natacao' },
  t1: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: 'swap_horiz', label: 'T1' },
  bike: { color: 'text-bike', bg: 'bg-bike/20', icon: 'directions_bike', label: 'Ciclismo' },
  t2: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: 'swap_horiz', label: 'T2' },
  run: { color: 'text-run', bg: 'bg-run/20', icon: 'directions_run', label: 'Corrida' },
};

export function RacePlanTimeline({ phases, className }: RacePlanTimelineProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {phases.map((phase, i) => {
        const config = disciplineConfig[phase.discipline] ?? { color: 'text-slate-400', bg: 'bg-slate-700/20', icon: 'fitness_center', label: phase.discipline };
        return (
          <div key={i} className="relative">
            {/* Connector line */}
            {i < phases.length - 1 && (
              <div className="absolute left-5 top-12 bottom-0 w-px bg-slate-700/50" />
            )}

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn('flex items-center justify-center w-10 h-10 rounded-full shrink-0', config.bg)}>
                <span className={cn('material-symbols-outlined text-xl', config.color)}>{config.icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className={cn('font-heading font-bold text-sm', config.color)}>{config.label}</h4>
                  <span className="font-[var(--font-mono)] text-[11px] text-slate-500">{phase.durationMin}min</span>
                </div>

                {phase.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {phase.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-elevated">
                        <span className="text-sm text-slate-100 flex-1 truncate">{item.productName}</span>
                        {item.carbsG != null && (
                          <span className="font-[var(--font-mono)] text-[11px] text-slate-400">{item.carbsG}g</span>
                        )}
                        {item.sodiumMg != null && (
                          <span className="font-[var(--font-mono)] text-[11px] text-slate-400">{item.sodiumMg}mg</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Sem nutricao nesta fase</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
