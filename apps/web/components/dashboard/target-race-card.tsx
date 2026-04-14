'use client';

import { cn } from '@/lib/utils';

interface TargetRace {
  id: string;
  raceName: string | null;
  distance: string;
  raceDate: string;
  targetTime: number | null;
  daysRemaining: number;
  readinessScore: number | null;
  planPhase: string | null;
  planProgress: number | null;
}

interface TargetRaceCardProps {
  race: TargetRace;
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

const distanceLabels: Record<string, string> = {
  'sprint': 'Sprint',
  'olympic': 'Olimpico',
  '70.3': 'Ironman 70.3',
  'full': 'Ironman Full',
};

const phaseConfig: Record<string, { label: string; color: string }> = {
  base: { label: 'BASE', color: 'text-blue-400' },
  build: { label: 'BUILD', color: 'text-amber-400' },
  peak: { label: 'PEAK', color: 'text-rose-400' },
  taper: { label: 'TAPER', color: 'text-emerald-400' },
};

export function TargetRaceCard({ race }: TargetRaceCardProps) {
  const readiness = race.readinessScore ?? 0;
  const readinessColor = readiness >= 70 ? 'text-emerald-400' : readiness >= 40 ? 'text-amber-400' : 'text-rose-400';
  const readinessLabel = readiness >= 70 ? 'Pronto' : readiness >= 40 ? 'Preparando' : 'Em construcao';

  const urgency = race.daysRemaining <= 7 ? 'critical' : race.daysRemaining <= 30 ? 'soon' : 'normal';

  return (
    <div className={cn(
      'rounded-[2rem] p-6 shadow-xl ring-1 ring-white/5 overflow-hidden',
      urgency === 'critical'
        ? 'bg-gradient-to-br from-rose-500/15 to-bg-surface'
        : urgency === 'soon'
          ? 'bg-gradient-to-br from-amber-500/10 to-bg-surface'
          : 'bg-bg-surface',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          {race.planPhase && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated border border-slate-700/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className={cn(
                'text-xs font-bold uppercase tracking-wider',
                phaseConfig[race.planPhase]?.color ?? 'text-slate-400',
              )}>
                {phaseConfig[race.planPhase]?.label ?? race.planPhase}
              </span>
            </span>
          )}
          <span className="text-xs text-slate-500 uppercase tracking-wider">
            {distanceLabels[race.distance] ?? race.distance}
          </span>
        </div>
        <div className="text-right shrink-0 max-w-[55%]">
          <p className="text-sm font-semibold text-slate-100 truncate">{race.raceName ?? 'Prova Alvo'}</p>
          <p className="text-xs text-slate-500">
            {new Date(race.raceDate + 'T00:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className={cn(
            'font-mono font-bold text-5xl leading-none',
            urgency === 'critical' ? 'text-rose-400' : 'text-slate-100',
          )}>
            {race.daysRemaining}
          </span>
          <span className="font-mono font-bold text-xl text-slate-400 ml-2">DIAS</span>
        </div>
        <div className="text-right">
          {race.targetTime && (
            <div className="mb-1">
              <p className="text-[10px] text-slate-500 uppercase">Meta</p>
              <p className="font-mono text-lg font-bold text-slate-200">{formatTime(race.targetTime)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Readiness gauge */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">Prontidao</span>
            <span className={cn('font-mono text-xs font-bold whitespace-nowrap', readinessColor)}>
              {readiness}% {readinessLabel}
            </span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                readiness >= 70 ? 'bg-emerald-500' : readiness >= 40 ? 'bg-amber-500' : 'bg-rose-500',
              )}
              style={{ width: `${readiness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Plan progress */}
      {race.planProgress != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Progresso do plano</span>
            <span className="font-mono text-xs text-slate-400">{race.planProgress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${race.planProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
