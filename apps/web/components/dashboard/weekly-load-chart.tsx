'use client';

import dynamic from 'next/dynamic';

interface DailyMetric {
  date: string;
  tss: number;
}

interface WeeklyLoadChartProps {
  metrics: DailyMetric[];
}

const WeeklyLoadChartInner = dynamic(() => import('./weekly-load-chart-inner'), { ssr: false });

export function WeeklyLoadChart({ metrics }: WeeklyLoadChartProps) {
  const last7 = metrics.slice(-7);

  return (
    <div className="rounded-card bg-bg-surface p-6 ring-1 ring-hairline shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-slate-400">bar_chart</span>
          <h3 className="font-heading text-base font-bold text-slate-100">Carga Semanal</h3>
        </div>
        <span className="text-xs text-slate-500">TSS diario</span>
      </div>

      <div className="h-32">
        <WeeklyLoadChartInner data={last7} />
      </div>
    </div>
  );
}
