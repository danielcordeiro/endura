'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CHART_COLORS } from '@/lib/chart-theme';

interface DailyMetric {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface ForecastPoint {
  date: string;
  plannedTss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface PMCForecastData {
  forecast: ForecastPoint[];
  plannedWorkouts: number;
  planCoverageUntil: string | null;
  race: { id: string; name: string | null; distance: string; priority: string; date: string; daysOut: number } | null;
  raceDay: { ctl: number; atl: number; tsb: number } | null;
  idealTsbRange: [number, number];
  peak: {
    status: 'ideal' | 'too_fresh' | 'too_fatigued' | 'building' | 'no_race' | 'no_plan';
    message: string;
    recommendedTaperStart: string | null;
  };
}

interface PMCChartProps {
  metrics: DailyMetric[];
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
  forecast?: PMCForecastData | null;
}

type TimeRange = '30d' | '60d' | '90d';

interface MergedPoint {
  date: string;
  tss: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  ctlF: number | null;
  atlF: number | null;
  tsbF: number | null;
}

const PEAK_META: Record<
  PMCForecastData['peak']['status'],
  { label: string; cls: string; icon: string }
> = {
  ideal: { label: 'No pico certo', cls: 'border-success/40 bg-success/10 text-success', icon: 'check_circle' },
  too_fresh: { label: 'Forma na mesa', cls: 'border-info/40 bg-info/10 text-info', icon: 'trending_up' },
  too_fatigued: { label: 'Risco de fadiga', cls: 'border-danger/40 bg-danger/10 text-danger', icon: 'warning' },
  building: { label: 'Em construção', cls: 'border-warning/40 bg-warning/10 text-warning', icon: 'construction' },
  no_plan: { label: 'Sem plano', cls: 'border-text-muted/40 bg-text-muted/10 text-text-secondary', icon: 'event_busy' },
  no_race: { label: 'Sem prova-alvo', cls: 'border-text-muted/40 bg-text-muted/10 text-text-secondary', icon: 'flag' },
};

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Lazy-load Recharts to avoid SSR issues with Turbopack
const PMCChartInner = dynamic(() => import('./pmc-chart-inner'), { ssr: false });

export function PMCChart({ metrics, currentCTL, currentATL, currentTSB, forecast }: PMCChartProps) {
  const [range, setRange] = useState<TimeRange>('90d');
  const [showForecast, setShowForecast] = useState(true);

  const days = range === '30d' ? 30 : range === '60d' ? 60 : 90;
  const history = metrics.slice(-days);

  const fc = forecast?.forecast ?? [];
  const hasForecast = !!forecast && fc.length > 0;
  const useForecast = hasForecast && showForecast;

  // Série combinada: histórico (sólido) + projeção (tracejado), conectados em "hoje".
  const data: MergedPoint[] = history.map((m) => ({
    date: m.date, tss: m.tss, ctl: m.ctl, atl: m.atl, tsb: m.tsb,
    ctlF: null, atlF: null, tsbF: null,
  }));
  if (useForecast && data.length > 0) {
    const last = data[data.length - 1]!;
    last.ctlF = last.ctl; last.atlF = last.atl; last.tsbF = last.tsb; // ponto de junção
    for (const p of fc) {
      data.push({ date: p.date, tss: p.plannedTss, ctl: null, atl: null, tsb: null, ctlF: p.ctl, atlF: p.atl, tsbF: p.tsb });
    }
  }

  const raceDay = forecast?.raceDay ?? null;
  const peak = forecast?.peak ?? null;
  const peakMeta = peak ? PEAK_META[peak.status] : null;
  const [lo, hi] = forecast?.idealTsbRange ?? [15, 25];

  return (
    <div className="rounded-card bg-bg-surface p-6 border border-hairline shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary">Performance</h3>
          <p className="text-xs text-text-muted mt-0.5">CTL / ATL / TSB{useForecast ? ' + projeção' : ''}</p>
        </div>
        <div className="flex gap-1 bg-bg-elevated rounded-full p-1">
          {(['30d', '60d', '90d'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                range === r ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Current values */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-elevated rounded-card-inner p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: CHART_COLORS.fitness }}>CTL</p>
          <p className="font-mono text-lg font-bold text-white">{currentCTL.toFixed(0)}</p>
          <p className="text-[10px] text-text-muted">Fitness</p>
        </div>
        <div className="bg-bg-elevated rounded-card-inner p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: CHART_COLORS.fatigue }}>ATL</p>
          <p className="font-mono text-lg font-bold text-white">{currentATL.toFixed(0)}</p>
          <p className="text-[10px] text-text-muted">Fadiga</p>
        </div>
        <div className="bg-bg-elevated rounded-card-inner p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: CHART_COLORS.form }}>TSB</p>
          <p className="font-mono text-lg font-bold" style={{ color: currentTSB >= 0 ? CHART_COLORS.form : CHART_COLORS.danger }}>
            {currentTSB >= 0 ? '+' : ''}{currentTSB.toFixed(0)}
          </p>
          <p className="text-[10px] text-text-muted">Forma</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 -mx-2">
        <PMCChartInner data={data} raceDate={useForecast ? forecast?.race?.date ?? null : null} />
      </div>

      {/* Legend + toggle de projeção */}
      <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.fitness }} />
          <span className="text-[10px] text-text-muted">Fitness (CTL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded border-dashed" style={{ backgroundColor: CHART_COLORS.fatigue }} />
          <span className="text-[10px] text-text-muted">Fadiga (ATL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.form }} />
          <span className="text-[10px] text-text-muted">Forma (TSB)</span>
        </div>
        {hasForecast && (
          <button
            onClick={() => setShowForecast((v) => !v)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
              showForecast ? 'bg-warning/15 text-warning' : 'bg-bg-elevated text-text-secondary'
            }`}
          >
            {showForecast ? '◠ projeção on' : '◠ projeção off'}
          </button>
        )}
      </div>

      {/* Banner de projeção de forma (o diferencial: PMC forward-looking) */}
      {useForecast && peak && peakMeta && (
        <div className={`mt-4 rounded-2xl border p-4 ${peakMeta.cls}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="material-symbols-outlined text-base">{peakMeta.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wider">Projeção de forma — {peakMeta.label}</span>
          </div>
          <p className="text-[13px] leading-snug text-text-primary/90">{peak.message}</p>
          {(raceDay || forecast?.race) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {forecast?.race && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-black/20">
                  {forecast.race.name || 'Prova'} · {fmtShort(forecast.race.date)} · {forecast.race.daysOut}d
                </span>
              )}
              {raceDay && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-black/20 font-mono">
                  TSB na prova: {raceDay.tsb >= 0 ? '+' : ''}{raceDay.tsb.toFixed(0)} (ideal {lo}–{hi})
                </span>
              )}
              {peak.recommendedTaperStart && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-black/20">
                  Taper sugerido: {fmtShort(peak.recommendedTaperStart)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
