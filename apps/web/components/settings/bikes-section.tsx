'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, cn } from '@/lib/utils';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

interface Bike {
  id: string;
  name: string;
  weightKg: string | null;
  crr: string | null;
  drivetrainEfficiency: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Crr por MODELO de pneu, AJUSTADO PRA ASFALTO. Os números do bicyclerolling-
// resistance.com são de rolo (drum, ~28,8 km/h / 42,5 kg); no asfalto real o Crr
// é ~1,5× maior — então guardo o valor road-adjusted, não o cru. Valores
// deliberadamente distintos por modelo pra o rótulo reverter sem coluna extra.
const TIRE_GROUPS: { group: string; options: { label: string; crr: string }[] }[] = [
  { group: 'Estrada — corrida (tubeless/látex)', options: [
    { label: 'Vittoria Corsa Pro Speed (TT)', crr: '0.0043' },
    { label: 'Veloflex Record (TT)', crr: '0.0044' },
    { label: 'Vittoria Corsa Pro', crr: '0.0046' },
    { label: 'Continental GP5000 S TR', crr: '0.0050' },
    { label: 'Specialized S-Works Turbo', crr: '0.0052' },
    { label: 'Michelin Power Cup', crr: '0.0053' },
    { label: 'Continental GP5000 (clincher)', crr: '0.0055' },
    { label: 'Pirelli P Zero Race', crr: '0.0057' },
  ] },
  { group: 'Estrada — treino/durável', options: [
    { label: 'Michelin Power Endurance', crr: '0.0068' },
    { label: 'Continental GP 4-Season', crr: '0.0074' },
    { label: 'Continental Gatorskin', crr: '0.0090' },
  ] },
  { group: 'Gravel', options: [
    { label: 'Continental Terra Speed', crr: '0.0076' },
    { label: 'Panaracer GravelKing (slick)', crr: '0.0085' },
    { label: 'Gravel cravado (genérico)', crr: '0.0110' },
  ] },
  { group: 'MTB', options: [
    { label: 'XC semi-slick', crr: '0.0120' },
    { label: 'Trail cravado', crr: '0.0150' },
  ] },
  { group: 'Genérico (não sei o modelo)', options: [
    { label: 'Estrada — premium', crr: '0.0045' },
    { label: 'Estrada — padrão 25/28mm', crr: '0.0048' },
    { label: 'Estrada — treino', crr: '0.0062' },
    { label: 'Gravel — genérico', crr: '0.0088' },
    { label: 'MTB — genérico', crr: '0.0130' },
  ] },
];

const ALL_TIRES = TIRE_GROUPS.flatMap((g) => g.options);

function tireLabel(crr: string | null): string {
  if (!crr) return '—';
  const match = ALL_TIRES.find((t) => Math.abs(Number(t.crr) - Number(crr)) < 1e-6);
  return match ? match.label : `Crr ${Number(crr).toFixed(4)}`;
}

interface FormState {
  id: string | null;
  name: string;
  weightKg: string;
  crr: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = { id: null, name: '', weightKg: '', crr: '', isDefault: false };

export function BikesSection({ token }: { token: string | null | undefined }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null); // null = fechado

  const listQuery = useQuery<{ data: Bike[] }>({
    queryKey: ['bikes'],
    queryFn: () => apiFetch<{ data: Bike[] }>('/api/bikes', { token: token ?? undefined }),
    enabled: !!token,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bikes'] });
    // O CdA das atividades depende da bike padrão/setup — invalida a lista/detalhe.
    queryClient.invalidateQueries({ queryKey: ['activity'] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: FormState) => {
      const body = JSON.stringify({
        name: f.name.trim(),
        weightKg: f.weightKg ? parseFloat(f.weightKg) : null,
        crr: f.crr ? parseFloat(f.crr) : null,
        isDefault: f.isDefault,
      });
      return f.id
        ? apiFetch(`/api/bikes/${f.id}`, { method: 'PUT', token: token ?? undefined, body })
        : apiFetch('/api/bikes', { method: 'POST', token: token ?? undefined, body });
    },
    onSuccess: () => { setForm(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/bikes/${id}`, { method: 'DELETE', token: token ?? undefined }),
    onSuccess: invalidate,
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/bikes/${id}/default`, { method: 'POST', token: token ?? undefined }),
    onSuccess: invalidate,
  });

  const bikes = listQuery.data?.data ?? [];
  const canSave = !!form?.name.trim() && !saveMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">Minhas bikes</p>
        <button
          onClick={() => setForm({ ...EMPTY_FORM, isDefault: bikes.length === 0 })}
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nova
        </button>
      </div>

      <p className="text-xs text-text-muted">
        Peso + pneu de cada bike alimentam a <span className="text-text-secondary">estimativa de CdA</span> nas
        pedaladas. A bike padrão é usada nas atividades novas; dá pra trocar por atividade.
      </p>

      {listQuery.isLoading && <div className="rounded-2xl border border-border bg-bg-surface p-4 h-16 animate-pulse" />}

      {bikes.length === 0 && !listQuery.isLoading && (
        <div className="rounded-2xl border border-border bg-bg-surface p-4 flex flex-col items-center gap-1.5 text-center">
          <span className="material-symbols-outlined text-2xl text-text-faint">directions_bike</span>
          <span className="text-xs text-text-muted">Nenhuma bike cadastrada</span>
        </div>
      )}

      {bikes.map((b) => (
        <div key={b.id} className="rounded-2xl border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bike/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-bike">directions_bike</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[15px] text-text-primary truncate">{b.name}</p>
                {b.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-dim text-success">
                    <span className="material-symbols-outlined text-[12px]">star</span>Padrão
                  </span>
                )}
              </div>
              <p className="text-[12px] text-text-muted mt-0.5">
                {b.weightKg ? `${Number(b.weightKg).toFixed(1)} kg` : 'peso —'} · {tireLabel(b.crr)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!b.isDefault && (
                <button
                  onClick={() => defaultMutation.mutate(b.id)}
                  disabled={defaultMutation.isPending}
                  title="Tornar padrão"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated border border-border-strong/50 text-text-secondary hover:text-success transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-lg">star</span>
                </button>
              )}
              <button
                onClick={() => setForm({
                  id: b.id, name: b.name,
                  weightKg: b.weightKg ? String(Number(b.weightKg)) : '',
                  crr: b.crr ? Number(b.crr).toFixed(4) : '',
                  isDefault: b.isDefault,
                })}
                title="Editar"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated border border-border-strong/50 text-text-secondary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button
                onClick={() => { if (confirm(`Excluir a bike "${b.name}"?`)) deleteMutation.mutate(b.id); }}
                disabled={deleteMutation.isPending}
                title="Excluir"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated border border-border-strong/50 text-danger hover:bg-danger/10 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      {(saveMutation.isError || deleteMutation.isError || defaultMutation.isError) && (
        <AlertBanner variant="danger">Erro ao salvar a bike. Tente novamente.</AlertBanner>
      )}

      {/* ── Modal add/edit ── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setForm(null)} />
          <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6 max-h-[90dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-bg-elevated rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-bike/15">
                <span className="material-symbols-outlined text-2xl text-bike">directions_bike</span>
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-text-primary">{form.id ? 'Editar bike' : 'Nova bike'}</h2>
                <p className="text-xs text-text-secondary">Peso e pneu alimentam o CdA</p>
              </div>
            </div>

            <div className="space-y-5">
              <Field label="Nome">
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Speed Concept, Bike de estrada"
                />
              </Field>

              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <Field label="Peso (kg)">
                  <Input
                    type="number"
                    step="0.1"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    placeholder="8.0"
                  />
                </Field>
                <Field label="Pneu (modelo)">
                  <select
                    value={form.crr}
                    onChange={(e) => setForm({ ...form, crr: e.target.value })}
                    className="w-full h-12 rounded-xl border border-border bg-bg-input px-3 text-text-primary text-base outline-none focus:border-border-focus"
                  >
                    <option value="">Não informado</option>
                    {TIRE_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.options.map((t) => (
                          <option key={t.label} value={t.crr}>{t.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="-mt-2 text-[11px] text-text-faint">
                Crr por modelo, ajustado pra asfalto (base bicyclerollingresistance.com).
                Afeta o valor absoluto do CdA, não a tendência.
              </p>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-bg-input cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-5 h-5 rounded border-text-faint accent-primary"
                />
                <span className="text-sm text-text-primary">Usar como bike padrão</span>
              </label>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setForm(null)}
                  className="flex-1 h-14 rounded-full bg-bg-elevated text-text-secondary font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => canSave && saveMutation.mutate(form)}
                  disabled={!canSave}
                  className="flex-1 h-14 rounded-full bg-primary text-white font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
