'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { PhaseTag } from '@/components/ui/phase-tag';
import { StatCard } from '@/components/ui/stat-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { LogSupplementSheet } from '@/components/nutrition/log-supplement-sheet';
import { ProtocolComparison } from '@/components/nutrition/protocol-comparison';
import { QuickLogButtons } from '@/components/nutrition/quick-log-buttons';
import { AiAnalysisCard } from '@/components/nutrition/ai-analysis-card';
import { ActivityAnalysis } from '@/components/activity/activity-analysis';
import { AeroTestSection } from '@/components/activity/aero-test-section';
import type { AnalysisResult } from '@/components/activity/analysis-types';

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
    tss?: number;
    hasStreams?: boolean;
    analysis?: AnalysisResult;
    bikeId?: string | null;
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
  pre: 'from-phase-pre/20 via-phase-pre/5',
  during: 'from-phase-during/20 via-phase-during/5',
  post: 'from-phase-post/20 via-phase-post/5',
};

const phaseIconColors: Record<Phase, string> = {
  pre: 'text-phase-pre',
  during: 'text-phase-during',
  post: 'text-phase-post',
};

/* ---------- Skeletons ---------- */

function DetailSkeleton() {
  return (
    <div className="py-6 space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-bg-surface" />
        <div className="h-5 w-40 rounded-lg bg-bg-surface" />
        <div className="ml-auto w-10 h-10 rounded-full bg-bg-surface" />
      </div>
      {/* Badge + date */}
      <div className="flex items-center gap-3">
        <div className="h-7 w-20 rounded-full bg-bg-surface" />
        <div className="h-4 w-36 rounded-lg bg-bg-surface" />
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-bg-surface border border-border" />
        ))}
      </div>
      {/* Map placeholder */}
      <div className="h-44 rounded-2xl bg-bg-surface border border-border" />
      {/* Nutrition */}
      <div className="space-y-3">
        <div className="h-5 w-24 rounded-lg bg-bg-surface" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-bg-surface border border-border" />
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
  const queryClient = useQueryClient();

  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showAdverseSheet, setShowAdverseSheet] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/activities/${params.id}`, {
        method: 'DELETE',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['performance-dashboard'] });
      router.push('/atividades');
    },
  });

  const { data, isLoading, isError, refetch } = useQuery<ActivityDetail>({
    queryKey: ['activity', params.id],
    queryFn: () =>
      apiFetch<ActivityDetail>(`/api/activities/${params.id}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!params.id,
  });

  const comparisonQuery = useQuery({
    queryKey: ['nutrition-comparison', params.id],
    queryFn: () =>
      apiFetch<{ data: {
        prescribed: { totalCarbsG: number; totalSodiumMg: number; totalCaffeineMg: number; totalKcal: number } | null;
        actual: { totalCarbsG: number; totalSodiumMg: number; totalCaffeineMg: number; totalKcal: number; followedExactly: boolean } | null;
        metrics: { carbsPerHour: number; sodiumPerHour: number; prescribedCarbsPerHour: number };
        status: { carbs: 'green' | 'yellow' | 'red'; sodium: 'green' | 'yellow' | 'red'; caffeine: 'green' | 'yellow' | 'red'; kcal: 'green' | 'yellow' | 'red' } | null;
        protocolId: string | null;
      } }>(`/api/nutrition/log/${params.id}/comparison`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!params.id,
  });

  const comparison = comparisonQuery.data?.data;
  const activity = data?.data;

  /* Group nutrition by phase */
  const nutritionByPhase = activity?.nutrition?.reduce(
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
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="font-body text-sm">Voltar</span>
        </button>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-text-muted">error_outline</span>
          </div>
          <p className="font-body text-[15px] text-text-secondary">
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
      <div className="py-6 space-y-8 animate-fade-in-up">
        {/* Header: back + title + more */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors active:scale-[0.98] shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <span className="font-heading font-bold text-xs text-text-secondary uppercase tracking-widest truncate flex-1 text-center">
            Detalhes da Atividade
          </span>
          <button
            onClick={() => setShowDeleteSheet(true)}
            aria-label="Excluir atividade"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-bg-surface border border-border text-text-secondary hover:text-danger hover:bg-bg-elevated transition-colors active:scale-[0.98] shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>

        {/* Title + Discipline + date */}
        <div className="space-y-2">
          <h1 className="font-heading font-bold text-2xl text-text-primary tracking-tight">
            {activity.title}
          </h1>
          <div className="flex items-center gap-3">
            <DisciplineBadge discipline={activity.discipline} size="md" />
            <span className="font-body text-[13px] text-text-secondary">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Stats grid 3 columns — Stitch style with circular icons */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: 'timer', label: 'Duração', value: activity.duration, unit: '' },
            { icon: 'location_on', label: 'Distância', value: activity.distance ?? '--', unit: '' },
            { icon: 'monitor_heart', label: 'Freq.', value: activity.avgHeartRate ?? '--', unit: activity.avgHeartRate ? 'bpm' : '' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 rounded-card border border-border bg-bg-surface p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15">
                <span className="material-symbols-outlined text-lg text-primary">{stat.icon}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{stat.label}</span>
              <div className="font-[var(--font-mono)] font-bold text-xl text-white leading-none">
                {stat.value}
                {stat.unit && <span className="text-sm text-text-muted font-normal">{stat.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Map placeholder */}
        <div className="relative h-44 rounded-2xl bg-bg-surface border border-border overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-transparent z-10" />
          {/* Placeholder pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-text-faint">map</span>
          </div>
          {/* Location badge */}
          <div className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-elevated/90 border border-border-strong/50 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
            <span className="text-[11px] font-medium text-text-secondary">Mapa em breve</span>
          </div>
        </div>

        {/* ── Análise avançada (NP/TSS/zonas/picos/laps) ── */}
        {activity.hasStreams && activity.analysis && (
          <ActivityAnalysis activityId={params.id} analysis={activity.analysis} bikeId={activity.bikeId} />
        )}

        {/* ── Teste Aero (Fase 2 — só bike com streams) ── */}
        {activity.hasStreams && activity.discipline === 'bike' && (
          <AeroTestSection activityId={params.id} />
        )}

        {/* ── Nutrition section ── */}
        <div className="space-y-5">
          <h2 className="font-heading font-semibold text-lg text-text-primary">
            Suplementacao
          </h2>

          {activity.nutrition.length === 0 && (
            <div className="flex flex-col items-center py-8 space-y-3">
              <span className="material-symbols-outlined text-[32px] text-text-faint">nutrition</span>
              <p className="font-body text-sm text-text-muted text-center">
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
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-bg-surface border border-border"
                    >
                      {/* Colored icon */}
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                        phase === 'pre' ? 'bg-phase-pre/15' : phase === 'during' ? 'bg-phase-during/15' : 'bg-phase-post/15',
                      )}>
                        <span className={cn('material-symbols-outlined text-[20px]', phaseIconColors[phase])}>
                          nutrition
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-text-primary font-medium truncate">
                          {item.product}
                        </p>
                        <p className="font-body text-[12px] text-text-muted">
                          {item.quantity}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[12px] text-text-secondary">
                          {item.carbsG}g
                        </span>
                        <span className="font-mono text-[12px] text-text-secondary">
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
              'border-2 border-dashed border-border-strong/50',
              'text-text-secondary text-sm font-medium',
              'hover:border-primary/30 hover:text-primary hover:bg-primary/5',
              'transition-all duration-200',
            )}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Adicionar consumo
          </button>
        </div>

        {/* ── Quick Log Buttons ── */}
        {comparison?.protocolId && (
          <QuickLogButtons
            activityId={params.id}
            protocolId={comparison.protocolId}
            hasLog={!!comparison.actual}
            onLogDifferences={() => setShowLogSheet(true)}
          />
        )}

        {/* ── Protocol Comparison ── */}
        {comparison && (comparison.prescribed || comparison.actual) && (
          <ProtocolComparison data={comparison} />
        )}

        {/* ── AI Analysis ── */}
        <AiAnalysisCard
          activityId={params.id}
          hasNutritionLog={!!comparison?.actual}
        />

        {/* Adverse event link */}
        <button
          onClick={() => setShowAdverseSheet(true)}
          className="flex items-center gap-2 text-text-muted hover:text-warning transition-colors font-body text-sm"
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
            <p className="font-body text-sm text-text-secondary">
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
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-bg-surface border-border hover:bg-bg-elevated',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-5 h-5 rounded border-text-faint accent-primary"
                  />
                  <span className="font-body text-sm text-text-primary">
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

        {/* Delete confirmation bottom sheet */}
        <BottomSheet
          open={showDeleteSheet}
          onClose={() => {
            if (!deleteMutation.isPending) setShowDeleteSheet(false);
          }}
          title="Excluir atividade"
        >
          <div className="space-y-4">
            <AlertBanner variant="danger">
              Esta acao nao pode ser desfeita. A atividade sera removida do Endura junto com a nutricao registrada e o calculo de CTL/ATL/TSB sera recalculado.
            </AlertBanner>
            {deleteMutation.isError && (
              <AlertBanner variant="danger">
                {(deleteMutation.error as { message?: string })?.message ?? 'Erro ao excluir atividade.'}
              </AlertBanner>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowDeleteSheet(false)}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
                className="bg-danger hover:bg-red-600 shadow-danger/25"
              >
                Excluir
              </Button>
            </div>
          </div>
        </BottomSheet>
      </div>

      {/* Fixed footer with nutritional summary */}
      {activity.nutrition.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="bg-gradient-to-t from-bg-base via-bg-base to-transparent pt-6 pb-6 px-5">
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between gap-2 px-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Resumo Nutricional</p>
                <span className="material-symbols-outlined text-sm text-text-faint">info</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {[
                  { value: activity.totals.carbsG, unit: 'g', label: 'CARB', color: 'bg-bg-surface' },
                  { value: activity.totals.sodiumMg, unit: 'mg', label: 'SÓDIO', color: 'bg-bg-surface' },
                  { value: activity.totals.caffeineMg, unit: 'mg', label: 'CAF', color: 'bg-bg-surface' },
                  { value: activity.totals.kcal, unit: '', label: 'KCAL', color: 'bg-primary/15' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex-1 text-center py-3 rounded-2xl border border-border',
                      item.color,
                    )}
                  >
                    <p className="font-[var(--font-mono)] font-bold text-base text-white leading-none">
                      {item.value}<span className="text-xs text-text-muted font-normal">{item.unit}</span>
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
