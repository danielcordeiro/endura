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
  draft: { label: 'Rascunho', bg: 'bg-text-muted/15', text: 'text-text-secondary' },
  tested: { label: 'Testado', bg: 'bg-warning/15', text: 'text-warning' },
  race_ready: { label: 'Race Ready', bg: 'bg-success/15', text: 'text-success' },
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
      className="p-4 rounded-card border border-border bg-bg-surface hover:bg-bg-elevated transition-colors active:scale-[0.98] cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-heading font-bold text-base text-text-primary truncate flex-1">
          {plan.name}
        </h3>
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ml-2 shrink-0', config.bg, config.text)}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
        <span>Tempo: {formatTime(plan.targetTimeSec)}</span>
        {totals && <span>{Math.round(totals.totalKcal)} kcal</span>}
      </div>

      {totals && (
        <div className="flex gap-2">
          <span className="font-[var(--font-mono)] text-[11px] text-text-secondary">{Math.round(totals.totalCarbsG)}g carb</span>
          <span className="font-[var(--font-mono)] text-[11px] text-text-secondary">{Math.round(totals.totalSodiumMg)}mg Na</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-strong/30">
        <span className="text-[11px] text-text-muted">
          {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          aria-label={`Excluir plano ${plan.name}`}
          className="text-text-muted hover:text-danger transition-colors"
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>
    </div>
  );
}
