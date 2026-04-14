'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const WeightChartInner = dynamic(() => import('./weight-chart-inner'), { ssr: false });

interface WeightHistory {
  currentWeight: number | null;
  profileWeight: number | null;
  history: Array<{ date: string; weightKg: number }>;
}

export function WeightCard() {
  const token = useAuthStore((s) => s.token);

  const { data, isLoading } = useQuery<WeightHistory>({
    queryKey: ['weight-history'],
    queryFn: async () => {
      const res = await apiFetch<{ data: WeightHistory }>('/api/integrations/intervals/weight-history?days=90', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="rounded-[2rem] bg-bg-surface p-6 ring-1 ring-white/5 shadow-xl">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!data || (!data.currentWeight && !data.profileWeight)) return null;

  const current = data.currentWeight ?? data.profileWeight;
  const history = data.history;

  // Calcular variação
  let delta: number | null = null;
  let deltaLabel = '';
  if (history.length >= 2) {
    const oldest = history[0]!.weightKg;
    const newest = history[history.length - 1]!.weightKg;
    delta = newest - oldest;
    deltaLabel = delta > 0 ? `+${delta.toFixed(1)}kg` : `${delta.toFixed(1)}kg`;
  }

  const min = history.length > 0 ? Math.min(...history.map((h) => h.weightKg)) : current ?? 0;
  const max = history.length > 0 ? Math.max(...history.map((h) => h.weightKg)) : current ?? 0;

  return (
    <div className="rounded-[2rem] bg-bg-surface p-6 ring-1 ring-white/5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-slate-400">scale</span>
          <h3 className="font-heading text-base font-bold text-slate-100">Peso</h3>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ultimos 90 dias</span>
      </div>

      {/* Current weight + delta */}
      <div className="flex items-end gap-3 mb-4">
        <span className="font-mono text-3xl font-bold text-white">{current?.toFixed(1)}</span>
        <span className="text-sm text-slate-500 mb-1">kg</span>
        {delta !== null && (
          <span className={cn(
            'font-mono text-sm font-bold mb-1 ml-auto px-2 py-0.5 rounded-full',
            delta < 0 ? 'text-emerald-400 bg-emerald-500/10' : delta > 0 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 bg-slate-800',
          )}>
            {deltaLabel}
          </span>
        )}
      </div>

      {/* Range */}
      {history.length > 1 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-500">Min: {min.toFixed(1)}kg</span>
          <span className="text-[10px] text-slate-500">Max: {max.toFixed(1)}kg</span>
        </div>
      )}

      {/* Chart */}
      {history.length > 1 && (
        <div className="h-28">
          <WeightChartInner data={history} />
        </div>
      )}

      {/* Source */}
      <p className="text-[9px] text-slate-600 mt-2 text-right">
        {history.length > 0 ? 'Garmin via intervals.icu' : 'Perfil do atleta'}
      </p>
    </div>
  );
}
