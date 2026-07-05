'use client';

import { cn } from '@/lib/utils';

interface RacePrediction {
  totalTimeSec: number;
  swimTimeSec: number;
  bikeTimeSec: number;
  runTimeSec: number;
  t1Sec: number;
  t2Sec: number;
  confidence: number;
  factors: {
    swimPace100m: number;
    bikePowerW: number | null;
    bikeSpeedKmh: number;
    runPaceKm: number;
    fitnessLevel: number;
    bikeElevationGainM?: number | null;
    runElevationGainM?: number | null;
  };
}

interface RacePredictorCardProps {
  prediction: RacePrediction;
  targetTimeSec?: number | null;
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPaceKm(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function formatPace100m(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}/100m`;
}

const splitConfig = [
  {
    key: 'swim',
    label: 'Swim',
    distance: '1.9km',
    icon: 'pool',
    color: 'text-swim',
    bg: 'bg-swim/15',
    barColor: 'bg-swim',
  },
  {
    key: 'bike',
    label: 'Bike',
    distance: '90km',
    icon: 'directions_bike',
    color: 'text-bike',
    bg: 'bg-bike/15',
    barColor: 'bg-bike',
  },
  {
    key: 'run',
    label: 'Run',
    distance: '21.1km',
    icon: 'directions_run',
    color: 'text-run',
    bg: 'bg-run/15',
    barColor: 'bg-run',
  },
];

export function RacePredictorCard({ prediction, targetTimeSec }: RacePredictorCardProps) {
  const splits = [
    { ...splitConfig[0], time: prediction.swimTimeSec },
    { ...splitConfig[1], time: prediction.bikeTimeSec },
    { ...splitConfig[2], time: prediction.runTimeSec },
  ];
  const maxTime = Math.max(...splits.map((s) => s.time!));

  const diff = targetTimeSec ? prediction.totalTimeSec - targetTimeSec : null;

  return (
    <div className="rounded-card bg-bg-surface p-6 border border-hairline shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-text-secondary">timer</span>
          <div>
            <h3 className="font-heading text-base font-bold text-text-primary">Race Predictor</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Ironman 70.3</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-elevated shrink-0">
          <span className="text-[10px] text-text-muted whitespace-nowrap">Confianca</span>
          <span className={cn(
            'font-mono text-xs font-bold',
            prediction.confidence >= 70 ? 'text-success' :
              prediction.confidence >= 40 ? 'text-warning' : 'text-danger',
          )}>
            {prediction.confidence}%
          </span>
        </div>
      </div>

      {/* Total predicted time */}
      <div className="text-center mb-5">
        <p className="font-mono text-4xl font-bold text-white tracking-tight">
          {formatTime(prediction.totalTimeSec)}
        </p>
        <p className="text-xs text-text-muted mt-1">Tempo previsto</p>
        {diff !== null && (
          <p className={cn(
            'text-xs font-mono font-bold mt-1',
            diff <= 0 ? 'text-success' : 'text-danger',
          )}>
            {diff <= 0 ? '' : '+'}{formatTime(Math.abs(diff))} {diff <= 0 ? 'abaixo' : 'acima'} da meta
          </p>
        )}
      </div>

      {/* Splits */}
      <div className="space-y-3 mb-4">
        {splits.map((split) => (
          <div key={split.key} className="flex items-center gap-3">
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg', split.bg)}>
              <span className={cn('material-symbols-outlined text-lg', split.color)}>
                {split.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-secondary">{split.label} ({split.distance})</span>
                <span className="font-mono text-sm font-bold text-white">{formatTime(split.time!)}</span>
              </div>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', split.barColor)}
                  style={{ width: `${(split.time! / maxTime) * 100}%`, opacity: 0.8 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transitions */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-bg-elevated rounded-xl p-2 text-center">
          <p className="text-[10px] text-text-muted">T1</p>
          <p className="font-mono text-xs font-bold text-text-secondary">{formatTime(prediction.t1Sec)}</p>
        </div>
        <div className="flex-1 bg-bg-elevated rounded-xl p-2 text-center">
          <p className="text-[10px] text-text-muted">T2</p>
          <p className="font-mono text-xs font-bold text-text-secondary">{formatTime(prediction.t2Sec)}</p>
        </div>
      </div>

      {/* Elevation badges */}
      {(prediction.factors.bikeElevationGainM || prediction.factors.runElevationGainM) && (
        <div className="flex gap-2 mb-4">
          {prediction.factors.bikeElevationGainM ? (
            <div className="flex-1 flex items-center gap-1.5 bg-bg-elevated rounded-xl p-2.5">
              <span className="material-symbols-outlined text-sm text-bike">landscape</span>
              <div>
                <p className="text-[10px] text-text-muted">Bike D+</p>
                <p className="font-mono text-xs font-bold text-white">{prediction.factors.bikeElevationGainM}m</p>
              </div>
            </div>
          ) : null}
          {prediction.factors.runElevationGainM ? (
            <div className="flex-1 flex items-center gap-1.5 bg-bg-elevated rounded-xl p-2.5">
              <span className="material-symbols-outlined text-sm text-run">landscape</span>
              <div>
                <p className="text-[10px] text-text-muted">Run D+</p>
                <p className="font-mono text-xs font-bold text-white">{prediction.factors.runElevationGainM}m</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Pace details */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated rounded-xl p-3 text-center">
          <p className="text-[10px] text-swim mb-0.5">Swim</p>
          <p className="font-mono text-xs font-bold text-white">{formatPace100m(prediction.factors.swimPace100m)}</p>
        </div>
        <div className="bg-bg-elevated rounded-xl p-3 text-center">
          <p className="text-[10px] text-bike mb-0.5">Bike</p>
          <p className="font-mono text-xs font-bold text-white">{prediction.factors.bikeSpeedKmh} km/h</p>
        </div>
        <div className="bg-bg-elevated rounded-xl p-3 text-center">
          <p className="text-[10px] text-run mb-0.5">Run</p>
          <p className="font-mono text-xs font-bold text-white">{formatPaceKm(prediction.factors.runPaceKm)}</p>
        </div>
      </div>
    </div>
  );
}
