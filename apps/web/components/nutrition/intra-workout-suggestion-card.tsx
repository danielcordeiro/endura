'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface SuggestionItem {
  phase: 'during';
  minuteOffset: number;
  productName: string;
  quantity: number;
  unit: 'un' | 'ml' | 'g' | 'scoop';
  carbsG: number;
  sodiumMg: number;
  caffeineMg?: number;
  kcal: number;
}

interface SuggestionResponse {
  data: {
    suggestion: {
      items: SuggestionItem[];
      totals: { totalCarbsG: number; totalSodiumMg: number; totalCaffeineMg: number; totalKcal: number };
      rationale: string;
    };
    existingProtocol: {
      id: string;
      status: string;
      items: SuggestionItem[];
      totalCarbsG: string | null;
      totalSodiumMg: string | null;
      totalKcal: number | null;
    } | null;
  };
}

function formatOffset(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${m}min`;
}

export function IntraWorkoutSuggestionCard({ workoutId, durationMin }: { workoutId: string; durationMin: number | null }) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SuggestionResponse['data']>({
    queryKey: ['nutrition-suggestion', workoutId],
    queryFn: async () => {
      const res = await apiFetch<SuggestionResponse>(`/api/nutrition-planner/suggestion/${workoutId}`, {
        token: token ?? undefined,
      });
      return res.data;
    },
    enabled: !!token && !!workoutId,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition-planner/accept-default/${workoutId}`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-suggestion', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
    },
  });

  if (isLoading || !data) {
    return <div className="rounded-2xl border border-slate-800/50 bg-bg-surface h-32 animate-pulse" />;
  }

  const accepted = data.existingProtocol?.status === 'accepted';
  const items = accepted ? (data.existingProtocol?.items ?? []) : data.suggestion.items;
  const totals = accepted
    ? {
        totalCarbsG: Number(data.existingProtocol?.totalCarbsG ?? 0),
        totalSodiumMg: Number(data.existingProtocol?.totalSodiumMg ?? 0),
        totalKcal: data.existingProtocol?.totalKcal ?? 0,
      }
    : data.suggestion.totals;

  // Caso: treino curto/leve, sem itens
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/50 bg-bg-surface p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl text-sky-400">water_drop</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nutricao</p>
            <p className="text-sm text-slate-200 mt-0.5">Sem necessidade de suplementacao — hidratacao com agua e suficiente.</p>
          </div>
        </div>
      </div>
    );
  }

  const perHour = durationMin && durationMin > 0 ? {
    carbs: Math.round((totals.totalCarbsG / durationMin) * 60),
    sodium: Math.round((totals.totalSodiumMg / durationMin) * 60),
  } : null;

  return (
    <div className="rounded-2xl border border-slate-800/50 bg-bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            accepted ? 'bg-emerald-500/15' : 'bg-amber-500/15')}>
            <span className={cn('material-symbols-outlined text-xl',
              accepted ? 'text-emerald-400' : 'text-amber-400')}>
              {accepted ? 'check_circle' : 'restaurant'}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {accepted ? 'Nutricao prescrita' : 'Nutricao sugerida'}
            </p>
            <p className="text-sm text-slate-200 mt-0.5">
              {perHour ? `${perHour.carbs}g carb/h · ${perHour.sodium}mg Na/h · ${totals.totalKcal} kcal total` : `${totals.totalKcal} kcal total`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-slate-500 w-12 shrink-0">{formatOffset(item.minuteOffset)}</span>
            <span className="flex-1 text-slate-200">{item.productName} · {item.quantity}{item.unit}</span>
            <span className="text-xs text-slate-500">
              {item.carbsG > 0 && `${item.carbsG * item.quantity}g carb`}
              {item.carbsG > 0 && item.sodiumMg > 0 && ' · '}
              {item.sodiumMg > 0 && `${item.sodiumMg * item.quantity}mg Na`}
            </span>
          </div>
        ))}
      </div>

      {!accepted && (
        <button
          onClick={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending}
          className="w-full h-12 rounded-full bg-primary text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {acceptMutation.isPending ? 'Salvando...' : 'Usar esta sugestao'}
        </button>
      )}
    </div>
  );
}
