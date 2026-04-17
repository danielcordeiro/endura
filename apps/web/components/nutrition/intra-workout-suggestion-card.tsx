'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface SuggestionItem {
  phase: 'during' | 'pre' | 'post';
  minuteOffset: number;
  productName: string;
  brand?: string;
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SuggestionItem[]>([]);

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
        method: 'POST', token: token ?? undefined, body: JSON.stringify({}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition-suggestion', workoutId] }),
  });

  const customizeMutation = useMutation({
    mutationFn: () => {
      if (!data?.existingProtocol?.id) throw new Error('no protocol');
      return apiFetch(`/api/nutrition-planner/customize/${data.existingProtocol.id}`, {
        method: 'PUT', token: token ?? undefined,
        body: JSON.stringify({ items: draft }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-suggestion', workoutId] });
      setEditing(false);
    },
  });

  if (isLoading || !data) {
    return <div className="rounded-2xl border border-slate-800/50 bg-bg-surface h-32 animate-pulse" />;
  }

  const accepted = data.existingProtocol?.status === 'accepted' || data.existingProtocol?.status === 'customized';
  const items = accepted ? (data.existingProtocol?.items ?? []) : data.suggestion.items;
  const totals = accepted
    ? {
        totalCarbsG: Number(data.existingProtocol?.totalCarbsG ?? 0),
        totalSodiumMg: Number(data.existingProtocol?.totalSodiumMg ?? 0),
        totalKcal: data.existingProtocol?.totalKcal ?? 0,
      }
    : data.suggestion.totals;

  // Caso: treino curto/leve, sem itens
  if (items.length === 0 && !editing) {
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

  const startEdit = () => {
    setDraft(items.map((i) => ({ ...i })));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft([]);
  };

  const updateItem = (idx: number, patch: Partial<SuggestionItem>) => {
    setDraft(draft.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeItem = (idx: number) => {
    setDraft(draft.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    const lastOffset = draft[draft.length - 1]?.minuteOffset ?? 0;
    setDraft([
      ...draft,
      {
        phase: 'during',
        minuteOffset: lastOffset + 20,
        productName: 'Gel esportivo',
        quantity: 1,
        unit: 'un',
        carbsG: 25,
        sodiumMg: 30,
        kcal: 100,
      },
    ]);
  };

  return (
    <div className="rounded-2xl border border-slate-800/50 bg-bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            accepted ? 'bg-emerald-500/15' : 'bg-amber-500/15')}>
            <span className={cn('material-symbols-outlined text-xl',
              accepted ? 'text-emerald-400' : 'text-amber-400')}>
              {accepted ? 'check_circle' : 'restaurant'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {editing ? 'Editando nutricao' : accepted ? 'Nutricao prescrita' : 'Nutricao sugerida'}
            </p>
            <p className="text-sm text-slate-200 mt-0.5 truncate">
              {perHour ? `${perHour.carbs}g carb/h · ${perHour.sodium}mg Na/h · ${totals.totalKcal} kcal total` : `${totals.totalKcal} kcal total`}
            </p>
          </div>
        </div>
        {accepted && !editing && (
          <button
            onClick={startEdit}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-bg-elevated border border-slate-700/50 text-slate-400 hover:text-slate-100 transition shrink-0"
            title="Editar"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {draft.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-slate-700/50 bg-bg-elevated p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={item.minuteOffset}
                  onChange={(e) => updateItem(idx, { minuteOffset: Number(e.target.value) })}
                  className="w-14 h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-xs text-white text-center font-mono"
                  title="Minuto"
                />
                <span className="text-xs text-slate-500">min</span>
                <input
                  type="text"
                  value={item.productName}
                  onChange={(e) => updateItem(idx, { productName: e.target.value })}
                  className="flex-1 h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-sm text-white"
                />
                <button
                  onClick={() => removeItem(idx)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 shrink-0"
                  title="Remover"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Marca (opcional)"
                  value={item.brand ?? ''}
                  onChange={(e) => updateItem(idx, { brand: e.target.value })}
                  className="flex-1 h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase">Qtd</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-xs text-white text-center"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase">Unidade</span>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value as SuggestionItem['unit'] })}
                    className="h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-xs text-white"
                  >
                    <option value="un">un</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="scoop">scoop</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase">Carb(g)</span>
                  <input
                    type="number"
                    min={0}
                    value={item.carbsG}
                    onChange={(e) => updateItem(idx, { carbsG: Number(e.target.value) })}
                    className="h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-xs text-white text-center"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase">Na(mg)</span>
                  <input
                    type="number"
                    min={0}
                    value={item.sodiumMg}
                    onChange={(e) => updateItem(idx, { sodiumMg: Number(e.target.value) })}
                    className="h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-xs text-white text-center"
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={addItem}
            className="w-full h-10 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-600 text-xs font-semibold flex items-center justify-center gap-1 transition"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Adicionar item
          </button>

          <div className="flex gap-3 pt-2">
            <button
              onClick={cancelEdit}
              className="flex-1 h-12 rounded-full bg-bg-elevated text-slate-300 font-semibold text-sm active:scale-[0.98] transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => customizeMutation.mutate()}
              disabled={customizeMutation.isPending || draft.length === 0}
              className="flex-1 h-12 rounded-full bg-primary text-white font-semibold text-sm active:scale-[0.98] transition disabled:opacity-50"
            >
              {customizeMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-slate-500 w-12 shrink-0">{formatOffset(item.minuteOffset)}</span>
                <span className="flex-1 text-slate-200 min-w-0 truncate">
                  {item.productName}
                  {item.brand && <span className="text-slate-500 text-xs"> · {item.brand}</span>}
                  {' · '}{item.quantity}{item.unit}
                </span>
                <span className="text-xs text-slate-500 shrink-0">
                  {item.carbsG > 0 && `${item.carbsG * item.quantity}g`}
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
        </>
      )}
    </div>
  );
}
