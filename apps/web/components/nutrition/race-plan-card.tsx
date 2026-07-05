'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface RacePlanCardProps {
  plan: {
    id: string;
    name: string;
    status: string;
    targetTimeSec: number | null;
    totals: { totalCarbsG: number; totalSodiumMg: number; totalKcal: number } | null;
    createdAt: string;
  };
  onSelect: (id: string) => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Rascunho', bg: 'bg-slate-500/15', text: 'text-slate-400' },
  tested: { label: 'Testado', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  race_ready: { label: 'Race Ready', bg: 'bg-green-500/15', text: 'text-green-400' },
};

function formatTime(sec: number | null): string {
  if (!sec) return '--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function RacePlanCard({ plan, onSelect }: RacePlanCardProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const config = statusConfig[plan.status] ?? statusConfig.draft!;

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/race-nutrition/plans/${plan.id}`, {
        method: 'DELETE',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['race-nutrition-plans'] });
    },
  });

  const totals = plan.totals as { totalCarbsG: number; totalSodiumMg: number; totalKcal: number } | null;

  return (
    <div
      onClick={() => onSelect(plan.id)}
      className="p-4 rounded-card border border-slate-800/50 bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-heading font-bold text-base text-text-primary truncate flex-1">
          {plan.name}
        </h3>
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ml-2 shrink-0', config.bg, config.text)}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span>Tempo: {formatTime(plan.targetTimeSec)}</span>
        {totals && <span>{Math.round(totals.totalKcal)} kcal</span>}
      </div>

      {totals && (
        <div className="flex gap-2">
          <span className="font-[var(--font-mono)] text-[11px] text-slate-400">{Math.round(totals.totalCarbsG)}g carb</span>
          <span className="font-[var(--font-mono)] text-[11px] text-slate-400">{Math.round(totals.totalSodiumMg)}mg Na</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/30">
        <span className="text-[11px] text-slate-500">
          {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          className="text-slate-500 hover:text-red-400 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>
    </div>
  );
}
