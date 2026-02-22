'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { PhaseTag } from '@/components/ui/phase-tag';
import { StatCard } from '@/components/ui/stat-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { LogSupplementSheet } from '@/components/nutrition/log-supplement-sheet';

/* ---------- Types ---------- */

type Discipline = 'swim' | 'bike' | 'run' | 'brick';
type Phase = 'pre' | 'during' | 'post';

interface NutritionItem {
  id: string;
  phase: Phase;
  product: string;
  quantity: string;
  carbsG: number;
  sodiumMg: number;
  caffeineMg?: number;
  kcal?: number;
  minuteOffset: number;
}

interface ActivityDetail {
  data: {
    id: string;
    title: string;
    discipline: Discipline;
    date: string;
    duration: string;
    distance?: string;
    avgHeartRate?: number;
    nutrition: NutritionItem[];
    totals: {
      carbsG: number;
      sodiumMg: number;
      caffeineMg: number;
      kcal: number;
    };
  };
}

const adverseEvents = [
  'Nausea',
  'Caimbra',
  'Desconforto GI',
  'Fadiga excessiva',
  'Tontura',
  'Dor de cabeca',
  'Outro',
];

const phaseLabels: Record<Phase, string> = {
  pre: 'PRE-TREINO',
  during: 'DURANTE',
  post: 'POS-TREINO',
};

const phaseColors: Record<Phase, string> = {
  pre: 'from-amber-500/20 via-amber-500/5',
  during: 'from-blue-500/20 via-blue-500/5',
  post: 'from-green-500/20 via-green-500/5',
};

const phaseIconColors: Record<Phase, string> = {
  pre: 'text-amber-400',
  during: 'text-blue-400',
  post: 'text-green-400',
};

/* ---------- Skeletons ---------- */

function DetailSkeleton() {
  return (
    <div className="py-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1c262f]" />
        <div className="h-5 w-40 rounded-lg bg-[#1c262f]" />
        <div className="ml-auto w-10 h-10 rounded-full bg-[#1c262f]" />
      </div>
      {/* Badge + date */}
      <div className="flex items-center gap-3">
        <div className="h-7 w-20 rounded-full bg-[#1c262f]" />
        <div className="h-4 w-36 rounded-lg bg-[#1c262f]" />
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[#1c262f] border border-slate-800/50" />
        ))}
      </div>
      {/* Map placeholder */}
      <div className="h-44 rounded-2xl bg-[#1c262f] border border-slate-800/50" />
      {/* Nutrition */}
      <div className="space-y-3">
        <div className="h-5 w-24 rounded-lg bg-[#1c262f]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-[#1c262f] border border-slate-800/50" />
        ))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function ActivityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { token } = useAuthStore();

  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showAdverseSheet, setShowAdverseSheet] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery<ActivityDetail>({
    queryKey: ['activity', params.id],
    queryFn: () =>
      apiFetch<ActivityDetail>(`/api/activities/${params.id}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!params.id,
  });

  const activity = data?.data;

  /* Group nutrition by phase */
  const nutritionByPhase = activity?.nutrition.reduce(
    (acc, item) => {
      if (!acc[item.phase]) acc[item.phase] = [];
      acc[item.phase].push(item);
      return acc;
    },
    {} as Record<Phase, NutritionItem[]>,
  );

  const phases: Phase[] = ['pre', 'during', 'post'];

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  }

  async function handleReportAdverse() {
    if (selectedEvents.length === 0) return;
    try {
      await apiFetch(`/api/activities/${params.id}/adverse-events`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ events: selectedEvents }),
      });
      setShowAdverseSheet(false);
      setSelectedEvents([]);
      refetch();
    } catch {
      // silently fail - user can retry
    }
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !activity) {
    return (
      <div className="py-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="font-body text-sm">Voltar</span>
        </button>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1c262f] border border-slate-800/50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-slate-500">error_outline</span>
          </div>
          <p className="font-body text-[15px] text-slate-400">
            Erro ao carregar atividade.
          </p>
          <Button variant="ghost" onClick={() => refetch()} className="rounded-full">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = format(parseISO(activity.date), "dd MMM yyyy · HH:mm", {
    locale: ptBR,
  });

  return (
    <div className="pb-36">
      <div className="py-6 space-y-6">
        {/* Header: back + title + more */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c262f] border border-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-[#283139] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="font-heading font-bold text-lg text-slate-100 truncate flex-1">
            Detalhes da Atividade
          </h1>
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c262f] border border-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-[#283139] transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
          </button>
        </div>

        {/* Title + Discipline + date */}
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-2xl text-slate-100 tracking-tight">
            {activity.title}
          </h2>
          <div className="flex items-center gap-3">
            <DisciplineBadge discipline={activity.discipline} size="md" />
            <span className="font-body text-[13px] text-slate-400">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Stats grid 3 columns */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Duracao"
            value={activity.duration}
            icon="timer"
            className="text-center"
          />
          <StatCard
            label="Distancia"
            value={activity.distance ?? '--'}
            icon="distance"
            className="text-center"
          />
          <StatCard
            label="Freq."
            value={activity.avgHeartRate ?? '--'}
            unit={activity.avgHeartRate ? 'bpm' : undefined}
            icon="monitor_heart"
            className="text-center"
          />
        </div>

        {/* Map placeholder */}
        <div className="relative h-44 rounded-2xl bg-[#1c262f] border border-slate-800/50 overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101a22] via-transparent to-transparent z-10" />
          {/* Placeholder pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-slate-700">map</span>
          </div>
          {/* Location badge */}
          <div className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#283139]/90 border border-slate-700/50 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px] text-[#1d8fed]">location_on</span>
            <span className="text-[11px] font-medium text-slate-300">Mapa em breve</span>
          </div>
        </div>

        {/* ── Nutrition section ── */}
        <div className="space-y-5">
          <h2 className="font-heading font-semibold text-lg text-slate-100">
            Suplementacao
          </h2>

          {activity.nutrition.length === 0 && (
            <div className="flex flex-col items-center py-8 space-y-3">
              <span className="material-symbols-outlined text-[32px] text-slate-600">nutrition</span>
              <p className="font-body text-sm text-slate-500 text-center">
                Nenhum consumo registrado.
              </p>
            </div>
          )}

          {phases.map((phase) => {
            const items = nutritionByPhase?.[phase];
            if (!items || items.length === 0) return null;

            return (
              <div key={phase} className="space-y-3">
                {/* Gradient divider + phase label */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-px flex-1 bg-gradient-to-r to-transparent',
                    phaseColors[phase],
                  )} />
                  <div className="flex items-center gap-1.5">
                    <PhaseTag phase={phase} />
                  </div>
                  <div className={cn(
                    'h-px flex-1 bg-gradient-to-l to-transparent',
                    phaseColors[phase],
                  )} />
                </div>

                {/* Product cards */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#1c262f] border border-slate-800/50"
                    >
                      {/* Colored icon */}
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                        phase === 'pre' ? 'bg-amber-500/15' : phase === 'during' ? 'bg-blue-500/15' : 'bg-green-500/15',
                      )}>
                        <span className={cn('material-symbols-outlined text-[20px]', phaseIconColors[phase])}>
                          nutrition
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-slate-100 font-medium truncate">
                          {item.product}
                        </p>
                        <p className="font-body text-[12px] text-slate-500">
                          {item.quantity}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[12px] text-slate-400">
                          {item.carbsG}g
                        </span>
                        <span className="font-mono text-[12px] text-slate-400">
                          {item.sodiumMg}mg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Dashed "Adicionar consumo" button */}
          <button
            onClick={() => setShowLogSheet(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-4 rounded-2xl',
              'border-2 border-dashed border-slate-700/50',
              'text-slate-400 text-sm font-medium',
              'hover:border-[#1d8fed]/30 hover:text-[#1d8fed] hover:bg-[#1d8fed]/5',
              'transition-all duration-200',
            )}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Adicionar consumo
          </button>
        </div>

        {/* Adverse event link */}
        <button
          onClick={() => setShowAdverseSheet(true)}
          className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors font-body text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">warning</span>
          Relatar evento adverso
        </button>

        {/* Log supplement bottom sheet */}
        <LogSupplementSheet
          activityId={params.id}
          open={showLogSheet}
          onClose={() => setShowLogSheet(false)}
          onSuccess={() => {
            setShowLogSheet(false);
            refetch();
          }}
        />

        {/* Adverse event bottom sheet */}
        <BottomSheet
          open={showAdverseSheet}
          onClose={() => {
            setShowAdverseSheet(false);
            setSelectedEvents([]);
          }}
          title="Relatar evento adverso"
        >
          <div className="space-y-4">
            <p className="font-body text-sm text-slate-400">
              Selecione os eventos que ocorreram durante esta atividade:
            </p>
            <div className="space-y-2">
              {adverseEvents.map((event) => (
                <label
                  key={event}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-150',
                    'border',
                    selectedEvents.includes(event)
                      ? 'bg-[#1d8fed]/10 border-[#1d8fed]/30'
                      : 'bg-[#1c262f] border-slate-800/50 hover:bg-[#283139]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-5 h-5 rounded border-slate-600 accent-[#1d8fed]"
                  />
                  <span className="font-body text-sm text-slate-100">
                    {event}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowAdverseSheet(false);
                  setSelectedEvents([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleReportAdverse}
                disabled={selectedEvents.length === 0}
              >
                Enviar
              </Button>
            </div>
          </div>
        </BottomSheet>
      </div>

      {/* Fixed footer with nutritional summary */}
      {activity.nutrition.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="bg-gradient-to-t from-[#101a22] via-[#101a22] to-transparent pt-6 pb-6 px-5">
            <div className="grid grid-cols-4 gap-2 p-4 rounded-2xl bg-[#1c262f] border border-slate-800/50 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Carb
                </p>
                <p className="font-mono font-bold text-base text-slate-100">
                  {activity.totals.carbsG}<span className="text-xs text-slate-500 font-normal">g</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Sodio
                </p>
                <p className="font-mono font-bold text-base text-slate-100">
                  {activity.totals.sodiumMg}<span className="text-xs text-slate-500 font-normal">mg</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Caf
                </p>
                <p className="font-mono font-bold text-base text-slate-100">
                  {activity.totals.caffeineMg}<span className="text-xs text-slate-500 font-normal">mg</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Kcal
                </p>
                <p className="font-mono font-bold text-base text-slate-100">
                  {activity.totals.kcal}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
