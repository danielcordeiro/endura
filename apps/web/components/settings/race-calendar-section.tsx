'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

/* ---------- Types ---------- */

interface RaceGoalItem {
  id: string;
  raceName: string | null;
  raceDate: string;
  distance: string;
  goal: string;
  targetTime: number | null;
  priority: string | null;
  location: string | null;
  notes: string | null;
  bikeElevationGainM: string | null;
  runElevationGainM: string | null;
  active: boolean;
}

interface RaceGoalsResponse {
  data: RaceGoalItem[];
}

/* ---------- Constants ---------- */

const DISTANCE_LABELS: Record<string, string> = {
  sprint: 'Sprint',
  olympic: 'Olímpico',
  '70.3': 'Ironman 70.3',
  full: 'Ironman (Full)',
  run_5k: 'Corrida 5k',
  run_10k: 'Corrida 10k',
  run_21k: 'Meia maratona (21k)',
  run_42k: 'Maratona (42k)',
  bike_event: 'Prova de ciclismo',
  swim_event: 'Prova de natação',
  other: 'Outra',
};

const DISTANCE_OPTIONS = Object.keys(DISTANCE_LABELS);

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  A: { label: 'A', cls: 'bg-primary text-white' },
  B: { label: 'B', cls: 'bg-amber-500/90 text-black' },
  C: { label: 'C', cls: 'bg-slate-600 text-slate-100' },
};

/* ---------- Helpers ---------- */

function secToHms(sec: number | null): string {
  if (sec == null) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function hmsToSec(hms: string): number | null {
  const t = hms.trim();
  if (!t) return null;
  const parts = t.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return parts[0]!;
}

interface FormState {
  raceName: string;
  raceDate: string;
  distance: string;
  priority: string;
  goal: string;
  targetTime: string;
  location: string;
  notes: string;
  bikeElevationGainM: string;
  runElevationGainM: string;
}

const emptyForm: FormState = {
  raceName: '',
  raceDate: '',
  distance: '70.3',
  priority: 'A',
  goal: 'finish',
  targetTime: '',
  location: '',
  notes: '',
  bikeElevationGainM: '',
  runElevationGainM: '',
};

/* ---------- Component ---------- */

export function RaceCalendarSection({ token }: { token: string | null }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [validationError, setValidationError] = useState('');

  const racesQuery = useQuery<RaceGoalsResponse>({
    queryKey: ['race-goals'],
    queryFn: () =>
      apiFetch<RaceGoalsResponse>('/api/athlete/race-goals', { token: token ?? undefined }),
    enabled: !!token,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['race-goals'] });
    queryClient.invalidateQueries({ queryKey: ['race-goal'] });
    queryClient.invalidateQueries({ queryKey: ['performance-dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      const isEdit = !!editingId;
      return apiFetch(
        isEdit ? `/api/athlete/race-goal/${editingId}` : '/api/athlete/race-goal',
        {
          method: isEdit ? 'PUT' : 'POST',
          token: token ?? undefined,
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      invalidate();
      closeSheet();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/athlete/race-goal/${id}`, { method: 'DELETE', token: token ?? undefined }),
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setValidationError('');
    setSheetOpen(true);
  }

  function openEdit(r: RaceGoalItem) {
    setEditingId(r.id);
    setForm({
      raceName: r.raceName ?? '',
      raceDate: r.raceDate,
      distance: r.distance,
      priority: r.priority ?? 'A',
      goal: r.goal,
      targetTime: secToHms(r.targetTime),
      location: r.location ?? '',
      notes: r.notes ?? '',
      bikeElevationGainM: r.bikeElevationGainM ?? '',
      runElevationGainM: r.runElevationGainM ?? '',
    });
    setValidationError('');
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setValidationError('');
  }

  function handleSave() {
    if (!form.raceDate.trim()) {
      setValidationError('Informe a data da prova.');
      return;
    }
    const payload: Record<string, unknown> = {
      distance: form.distance,
      raceDate: form.raceDate,
      goal: form.goal,
      priority: form.priority,
      raceName: form.raceName.trim() || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      targetTime: form.goal === 'time' ? hmsToSec(form.targetTime) : null,
      bikeElevationGainM: form.bikeElevationGainM ? Number(form.bikeElevationGainM) : null,
      runElevationGainM: form.runElevationGainM ? Number(form.runElevationGainM) : null,
    };
    saveMutation.mutate(payload);
  }

  const races = racesQuery.data?.data ?? [];
  const today = new Date();

  const setField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Calendário de provas
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 text-primary text-[13px] font-semibold hover:text-primary-bright transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Adicionar
        </button>
      </div>

      {deleteMutation.isError && (
        <AlertBanner variant="danger">Erro ao excluir prova.</AlertBanner>
      )}

      {/* Loading */}
      {racesQuery.isLoading && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[76px] rounded-2xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!racesQuery.isLoading && races.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700/50 bg-bg-surface p-6 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-600">event</span>
          <p className="text-sm text-slate-400 mt-1">Nenhuma prova no calendário.</p>
          <button onClick={openCreate} className="text-primary text-[13px] font-semibold mt-2">
            Adicionar a primeira
          </button>
        </div>
      )}

      {/* List */}
      {races.map((r) => {
        const days = differenceInDays(parseISO(r.raceDate), today);
        const pri = PRIORITY_META[r.priority ?? 'A'] ?? PRIORITY_META.A!;
        const isPast = days < 0;
        return (
          <button
            key={r.id}
            onClick={() => openEdit(r)}
            className={cn(
              'w-full text-left relative rounded-2xl border border-slate-800/50 bg-bg-surface p-4 flex items-center gap-3 transition-colors hover:border-slate-700',
              isPast && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm',
                pri.cls,
              )}
              title={`Prioridade ${pri.label}`}
            >
              {pri.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100 truncate leading-tight">
                {r.raceName || DISTANCE_LABELS[r.distance] || 'Prova'}
              </p>
              <p className="text-[12px] text-slate-400 mt-0.5 truncate">
                {DISTANCE_LABELS[r.distance] ?? r.distance}
                {' · '}
                {format(parseISO(r.raceDate), "dd MMM yyyy", { locale: ptBR })}
                {r.location ? ` · ${r.location}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-center">
              <p
                className={cn(
                  'font-[var(--font-mono)] font-bold text-lg leading-none',
                  isPast ? 'text-slate-500' : 'text-primary',
                )}
              >
                {isPast ? '—' : days}
              </p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                {isPast ? 'feita' : 'dias'}
              </p>
            </div>
          </button>
        );
      })}

      {/* Create/Edit Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingId ? 'Editar prova' : 'Adicionar prova'}
      >
        <div className="flex flex-col gap-5">
          <Field label="Nome da prova">
            <Input
              type="text"
              placeholder="Ex: IRONMAN 70.3 Nice"
              value={form.raceName}
              onChange={(e) => setField('raceName', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input
                type="date"
                value={form.raceDate}
                onChange={(e) => setField('raceDate', e.target.value)}
              />
            </Field>
            <Field label="Prioridade">
              <div className="flex gap-2 h-12">
                {(['A', 'B', 'C'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setField('priority', p)}
                    className={cn(
                      'flex-1 rounded-2xl border font-bold text-sm transition-colors',
                      form.priority === p
                        ? PRIORITY_META[p]!.cls + ' border-transparent'
                        : 'border-slate-700/50 text-slate-400 bg-bg-input',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Tipo / distância">
            <Select value={form.distance} onValueChange={(v) => setField('distance', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DISTANCE_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Local">
            <Input
              type="text"
              placeholder="Ex: Nice, França"
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Objetivo">
              <div className="flex gap-2 h-12">
                {([['finish', 'Concluir'], ['time', 'Tempo']] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setField('goal', val)}
                    className={cn(
                      'flex-1 rounded-2xl border text-sm font-semibold transition-colors',
                      form.goal === val
                        ? 'bg-primary text-white border-transparent'
                        : 'border-slate-700/50 text-slate-400 bg-bg-input',
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            {form.goal === 'time' && (
              <Field label="Tempo alvo (h:m:s)">
                <Input
                  type="text"
                  placeholder="04:30:00"
                  value={form.targetTime}
                  onChange={(e) => setField('targetTime', e.target.value)}
                  className="font-[var(--font-mono)]"
                />
              </Field>
            )}
          </div>

          {form.distance === '70.3' || form.distance === 'full' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="D+ bike (m)">
                <Input
                  type="number"
                  placeholder="0"
                  value={form.bikeElevationGainM}
                  onChange={(e) => setField('bikeElevationGainM', e.target.value)}
                />
              </Field>
              <Field label="D+ corrida (m)">
                <Input
                  type="number"
                  placeholder="0"
                  value={form.runElevationGainM}
                  onChange={(e) => setField('runElevationGainM', e.target.value)}
                />
              </Field>
            </div>
          ) : null}

          <Field label="Notas">
            <Textarea
              placeholder="Estratégia, logística, checklist…"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={2}
            />
          </Field>

          {validationError && (
            <p className="text-[13px] text-red-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">error</span>
              {validationError}
            </p>
          )}
          {saveMutation.isError && (
            <p className="text-[13px] text-red-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">error</span>
              Erro ao salvar. Tente novamente.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-6 mt-auto">
          {editingId && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                if (editingId) deleteMutation.mutate(editingId);
                closeSheet();
              }}
              className="px-5 text-red-400"
            >
              <span className="material-symbols-outlined">delete</span>
            </Button>
          )}
          <Button variant="secondary" size="lg" fullWidth onClick={closeSheet}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            loading={saveMutation.isPending}
          >
            Salvar
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
