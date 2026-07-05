'use client';

import { cn } from '@/lib/utils';

interface DisciplineBenchmark {
  discipline: 'swim' | 'bike' | 'run';
  totalActivities: number;
  last30dActivities: number;
  bestPace: number | null;
  avgPace: number | null;
  bestSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  bestPowerW: number | null;
  avgPowerW: number | null;
  bestHr: number | null;
  avgHr: number | null;
  longestDistanceM: number | null;
  longestDurationSec: number | null;
  totalDistanceM: number;
  totalDurationSec: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface DisciplineBenchmarksProps {
  swim: DisciplineBenchmark;
  bike: DisciplineBenchmark;
  run: DisciplineBenchmark;
}

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}min`;
}

const disciplineConfig = {
  swim: {
    label: 'Natacao',
    icon: 'pool',
    color: 'text-swim',
    bg: 'bg-swim/15',
    border: 'border-swim/30',
    accent: '#06b6d4',
  },
  bike: {
    label: 'Ciclismo',
    icon: 'directions_bike',
    color: 'text-bike',
    bg: 'bg-bike/15',
    border: 'border-bike/30',
    accent: '#3b82f6',
  },
  run: {
    label: 'Corrida',
    icon: 'directions_run',
    color: 'text-run',
    bg: 'bg-run/15',
    border: 'border-run/30',
    accent: '#f97316',
  },
};

const trendConfig = {
  improving: { label: 'Melhorando', icon: 'trending_up', color: 'text-success' },
  declining: { label: 'Caindo', icon: 'trending_down', color: 'text-danger' },
  stable: { label: 'Estavel', icon: 'trending_flat', color: 'text-text-secondary' },
};

function BenchmarkCard({ data }: { data: DisciplineBenchmark }) {
  const config = disciplineConfig[data.discipline];
  const trend = trendConfig[data.recentTrend];

  if (data.totalActivities === 0) {
    return (
      <div className={cn('rounded-card-inner bg-bg-surface border p-4', config.border)}>
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg', config.bg)}>
            <span className={cn('material-symbols-outlined text-lg', config.color)}>{config.icon}</span>
          </div>
          <span className="text-sm font-bold text-text-primary">{config.label}</span>
        </div>
        <p className="text-xs text-text-muted text-center py-4">Sem atividades nos ultimos 180 dias</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-card-inner bg-bg-surface border p-4', config.border)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg', config.bg)}>
            <span className={cn('material-symbols-outlined text-lg', config.color)}>{config.icon}</span>
          </div>
          <div>
            <span className="text-sm font-bold text-text-primary">{config.label}</span>
            <p className="text-[10px] text-text-muted">{data.totalActivities} treinos (180d)</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn('material-symbols-outlined text-sm', trend.color)}>{trend.icon}</span>
          <span className={cn('text-[10px] font-bold', trend.color)}>{trend.label}</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        {/* Best pace/speed */}
        {data.discipline === 'swim' && data.bestPace && (
          <>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Melhor pace</p>
              <p className="font-mono text-sm font-bold text-white">{formatPace(data.bestPace)}<span className="text-[10px] text-text-muted">/100m</span></p>
            </div>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Pace medio</p>
              <p className="font-mono text-sm font-bold text-text-secondary">{formatPace(data.avgPace!)}<span className="text-[10px] text-text-muted">/100m</span></p>
            </div>
          </>
        )}
        {data.discipline === 'run' && data.bestPace && (
          <>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Melhor pace</p>
              <p className="font-mono text-sm font-bold text-white">{formatPace(data.bestPace)}<span className="text-[10px] text-text-muted">/km</span></p>
            </div>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Pace medio</p>
              <p className="font-mono text-sm font-bold text-text-secondary">{formatPace(data.avgPace!)}<span className="text-[10px] text-text-muted">/km</span></p>
            </div>
          </>
        )}
        {data.discipline === 'bike' && (
          <>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Melhor velocidade</p>
              <p className="font-mono text-sm font-bold text-white">{data.bestSpeedKmh}<span className="text-[10px] text-text-muted"> km/h</span></p>
            </div>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Velocidade media</p>
              <p className="font-mono text-sm font-bold text-text-secondary">{data.avgSpeedKmh}<span className="text-[10px] text-text-muted"> km/h</span></p>
            </div>
          </>
        )}

        {/* Power (bike) */}
        {data.discipline === 'bike' && data.bestPowerW && (
          <>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Melhor potencia</p>
              <p className="font-mono text-sm font-bold text-white">{data.bestPowerW}<span className="text-[10px] text-text-muted"> W</span></p>
            </div>
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">Potencia media</p>
              <p className="font-mono text-sm font-bold text-text-secondary">{data.avgPowerW}<span className="text-[10px] text-text-muted"> W</span></p>
            </div>
          </>
        )}

        {/* HR */}
        {data.avgHr && (
          <div className="bg-bg-elevated rounded-xl p-2.5">
            <p className="text-[10px] text-text-muted mb-0.5">FC media</p>
            <p className="font-mono text-sm font-bold text-text-secondary">{data.avgHr}<span className="text-[10px] text-text-muted"> bpm</span></p>
          </div>
        )}

        {/* Longest */}
        {data.longestDistanceM && (
          <div className="bg-bg-elevated rounded-xl p-2.5">
            <p className="text-[10px] text-text-muted mb-0.5">Maior distancia</p>
            <p className="font-mono text-sm font-bold text-text-secondary">{formatDistance(data.longestDistanceM)}</p>
          </div>
        )}
      </div>

      {/* Volume footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-[10px] text-text-muted">Volume total (180d)</span>
        <span className="font-mono text-xs text-text-secondary">
          {formatDistance(data.totalDistanceM)} &middot; {formatDuration(data.totalDurationSec)}
        </span>
      </div>
    </div>
  );
}

export function DisciplineBenchmarks({ swim, bike, run }: DisciplineBenchmarksProps) {
  return (
    <div className="rounded-card bg-bg-surface p-6 border border-hairline shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-lg text-text-secondary">analytics</span>
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary">Testes por Disciplina</h3>
          <p className="text-[10px] text-text-muted">Resultados dos ultimos 180 dias</p>
        </div>
      </div>

      <div className="space-y-3">
        <BenchmarkCard data={swim} />
        <BenchmarkCard data={bike} />
        <BenchmarkCard data={run} />
      </div>
    </div>
  );
}
