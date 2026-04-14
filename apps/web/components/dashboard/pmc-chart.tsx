'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

interface DailyMetric {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

interface PMCChartProps {
  metrics: DailyMetric[];
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
}

type TimeRange = '30d' | '60d' | '90d';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Lazy-load Recharts to avoid SSR issues with Turbopack
const PMCChartInner = dynamic(() => import('./pmc-chart-inner'), { ssr: false });

export function PMCChart({ metrics, currentCTL, currentATL, currentTSB }: PMCChartProps) {
  const [range, setRange] = useState<TimeRange>('90d');

  const days = range === '30d' ? 30 : range === '60d' ? 60 : 90;
  const data = metrics.slice(-days);

  return (
    <div className="rounded-[2rem] bg-bg-surface p-6 ring-1 ring-white/5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-bold text-slate-100">Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">CTL / ATL / TSB</p>
        </div>
        <div className="flex gap-1 bg-bg-elevated rounded-full p-1">
          {(['30d', '60d', '90d'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                range === r
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Current values */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-elevated rounded-2xl p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">CTL</p>
          <p className="font-mono text-lg font-bold text-white">{currentCTL.toFixed(0)}</p>
          <p className="text-[10px] text-slate-500">Fitness</p>
        </div>
        <div className="bg-bg-elevated rounded-2xl p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">ATL</p>
          <p className="font-mono text-lg font-bold text-white">{currentATL.toFixed(0)}</p>
          <p className="text-[10px] text-slate-500">Fadiga</p>
        </div>
        <div className="bg-bg-elevated rounded-2xl p-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">TSB</p>
          <p className={`font-mono text-lg font-bold ${currentTSB >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currentTSB >= 0 ? '+' : ''}{currentTSB.toFixed(0)}
          </p>
          <p className="text-[10px] text-slate-500">Forma</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 -mx-2">
        <PMCChartInner data={data} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-500 rounded" />
          <span className="text-[10px] text-slate-500">Fitness (CTL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-rose-500 rounded border-dashed" />
          <span className="text-[10px] text-slate-500">Fadiga (ATL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-500 rounded" />
          <span className="text-[10px] text-slate-500">Forma (TSB)</span>
        </div>
      </div>
    </div>
  );
}
