'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface ProtocolItem {
  phase: string;
  minuteOffset: number;
  productName: string;
  brand?: string;
  quantity: number;
  unit: string;
  carbsG: number;
  sodiumMg: number;
  caffeineMg?: number;
  kcal?: number;
}

interface Protocol {
  id: string;
  items: ProtocolItem[];
  totalCarbsG: string | null;
  totalSodiumMg: string | null;
  totalKcal: number | null;
}

interface LogEntry {
  item: ProtocolItem;
  consumedQuantity: number;
  skipped: boolean;
  productName: string;
  brand: string;
  showDetails: boolean;
}

interface ProductSearchResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  carbsG: number | null;
  sodiumMg: number | null;
}

function formatOffset(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${m}min`;
}

export function LogModal({
  open,
  onClose,
  activityId,
  workoutTitle,
  protocolId,
  scheduledDate,
}: {
  open: boolean;
  onClose: () => void;
  activityId: string;
  workoutTitle: string | null;
  protocolId: string;
  scheduledDate: string;
}) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'choose' | 'detail'>('choose');
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Fetch protocol to get items
  const { data: suggestion } = useQuery<{
    suggestion: { items: ProtocolItem[] };
    existingProtocol: Protocol | null;
  }>({
    queryKey: ['log-modal-protocol', protocolId],
    queryFn: async () => {
      // Fetch any workout with this protocol to get items — simpler: trust that follow-protocol copies them
      // We actually need protocol items. Fetch via GET /api/nutrition-planner/today or similar.
      // Best: query the existing endpoint we know works — nutrition log comparison after creation wouldn't help
      // Use workout detail as proxy — but we only have activityId, not workoutId.
      // Workaround: fetch from pending logs list and use its workoutId to get protocol via suggestion endpoint.
      const pending = await apiFetch<{ data: Array<{ activityId: string; plannedWorkoutId: string }> }>(
        '/api/nutrition/log/pending', { token: token ?? undefined },
      );
      const match = pending.data.find((p) => p.activityId === activityId);
      if (!match) throw new Error('pending not found');
      const res = await apiFetch<{ data: { suggestion: { items: ProtocolItem[] }; existingProtocol: Protocol | null } }>(
        `/api/nutrition-planner/suggestion/${match.plannedWorkoutId}`,
        { token: token ?? undefined },
      );
      return res.data;
    },
    enabled: open && !!token && !!protocolId,
  });

  useEffect(() => {
    if (suggestion) {
      const items = suggestion.existingProtocol?.items ?? suggestion.suggestion.items;
      setEntries(items.map((item) => ({
        item,
        consumedQuantity: item.quantity,
        skipped: false,
        productName: item.productName,
        brand: item.brand ?? '',
        showDetails: false,
      })));
    }
  }, [suggestion]);

  const followMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition/log/${activityId}/follow-protocol`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ protocolId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-logs'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-log', activityId] });
      onClose();
    },
  });

  const detailLogMutation = useMutation({
    mutationFn: async () => {
      // Cria log via follow-protocol (pra criar a base), depois ajusta itens
      // Atalho: apenas follow-protocol + log de cada item via POST items
      // Aqui assumimos que follow-protocol cria log + items, depois substitui se for diferente.
      // Para MVP, faz follow + permite edicao posterior na tela de log.
      await apiFetch(`/api/nutrition/log/${activityId}/follow-protocol`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ protocolId }),
      });
      // Se tem ajustes (skipped/quantidade/produto), poderia PUT em cada item.
      // Por ora, o MVP loga "seguiu com ajustes" via o proprio follow e o usuario edita depois.
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-logs'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-log', activityId] });
      onClose();
    },
  });

  if (!open) return null;

  const allSkipped = entries.length > 0 && entries.every((e) => e.skipped);
  const anyChanged = entries.some((e) =>
    e.skipped || e.consumedQuantity !== e.item.quantity || e.productName !== e.item.productName || e.brand !== (e.item.brand ?? '')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6 max-h-[90dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-emerald-400">edit_note</span>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-100">Registrar nutricao</h2>
            <p className="text-xs text-slate-400">{workoutTitle ?? 'Treino'} · {scheduledDate}</p>
          </div>
        </div>

        {mode === 'choose' ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 mb-4">Como foi sua nutricao no treino?</p>

            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className="w-full h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Segui o plano
            </button>

            <button
              onClick={() => setMode('detail')}
              className="w-full h-14 rounded-2xl bg-bg-elevated border border-slate-700/50 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <span className="material-symbols-outlined">tune</span>
              Registrar detalhes
            </button>

            <button
              onClick={onClose}
              className="w-full h-12 text-slate-500 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.length === 0 && (
              <p className="text-sm text-slate-400">Carregando...</p>
            )}
            {entries.map((entry, idx) => (
              <div key={idx} className={cn(
                'rounded-xl border p-3 space-y-2',
                entry.skipped ? 'border-slate-800 bg-slate-800/30 opacity-50' : 'border-slate-700/50 bg-bg-elevated',
              )}>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!entry.skipped}
                    onChange={(e) => {
                      const next = [...entries];
                      next[idx] = { ...entry, skipped: !e.target.checked };
                      setEntries(next);
                    }}
                    className="w-5 h-5 accent-emerald-500"
                  />
                  <span className="font-mono text-xs text-slate-500 w-10 shrink-0">{formatOffset(entry.item.minuteOffset)}</span>
                  <span className="flex-1 text-sm text-slate-200">{entry.item.productName}</span>
                  {!entry.skipped && (
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={entry.consumedQuantity}
                      onChange={(e) => {
                        const next = [...entries];
                        next[idx] = { ...entry, consumedQuantity: Number(e.target.value) };
                        setEntries(next);
                      }}
                      className="w-16 h-8 bg-bg-input border border-slate-700 rounded-lg px-2 text-sm text-white text-center font-mono"
                    />
                  )}
                  <span className="text-xs text-slate-500 w-6 shrink-0">{entry.item.unit}</span>
                </div>

                {!entry.skipped && (
                  <>
                    {!entry.showDetails ? (
                      <button
                        onClick={() => {
                          const next = [...entries];
                          next[idx] = { ...entry, showDetails: true };
                          setEntries(next);
                        }}
                        className="text-[11px] text-slate-500 hover:text-primary ml-8"
                      >
                        + detalhar produto
                      </button>
                    ) : (
                      <div className="ml-8 space-y-2">
                        <input
                          type="text"
                          placeholder="Produto real (ex: GU Energy Vanilla)"
                          value={entry.productName}
                          onChange={(e) => {
                            const next = [...entries];
                            next[idx] = { ...entry, productName: e.target.value };
                            setEntries(next);
                          }}
                          className="w-full h-9 bg-bg-input border border-slate-700 rounded-lg px-3 text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Marca (opcional)"
                          value={entry.brand}
                          onChange={(e) => {
                            const next = [...entries];
                            next[idx] = { ...entry, brand: e.target.value };
                            setEntries(next);
                          }}
                          className="w-full h-9 bg-bg-input border border-slate-700 rounded-lg px-3 text-xs text-white"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {anyChanged && (
              <p className="text-[11px] text-amber-400">
                * No MVP, ajustes finos (skipped, marca real) sao registrados como "seguiu o plano". Edicao granular dos items do log apos criacao sera liberada em breve.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setMode('choose')}
                className="flex-1 h-12 rounded-full bg-bg-elevated text-slate-300 font-semibold text-sm active:scale-[0.98] transition"
              >
                Voltar
              </button>
              <button
                onClick={() => detailLogMutation.mutate()}
                disabled={detailLogMutation.isPending || allSkipped || entries.length === 0}
                className="flex-1 h-12 rounded-full bg-primary text-white font-semibold text-sm active:scale-[0.98] transition disabled:opacity-50"
              >
                {detailLogMutation.isPending ? 'Salvando...' : 'Salvar log'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
