'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { NutritionTimeline } from '@/components/ui/nutrition-timeline';
import { AlertBanner } from '@/components/ui/alert-banner';
import { IntraWorkoutSuggestionCard } from '@/components/nutrition/intra-workout-suggestion-card';

/* ── Types ── */

interface NutritionItem {
  phase: string;
  minuteOffset: number;
  product: string;
  carbsG?: number;
  sodiumMg?: number;
  caffeineMg?: number;
  kcal?: number;
}

interface WorkoutDetail {
  id: string;
  discipline: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  durationMin: number;
  distanceM: number | null;
  intensityZone: string | null;
  tssEstimate: number | null;
  structure: { warmup: string; main: string; cooldown: string } | null;
  sentToWatch: boolean;
  sentAt: string | null;
  nutritionProtocol: {
    items: NutritionItem[];
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  } | null;
}

/* ── Helpers ── */

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/* ── Skeleton ── */

function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6 pt-4 pb-28">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-full bg-slate-800/60 animate-pulse" />
        <div className="h-4 w-36 rounded bg-slate-800/60 animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-slate-800/60 animate-pulse" />
      </div>

      {/* Badge + title */}
      <div className="space-y-3">
        <div className="h-7 w-20 rounded-full bg-slate-800/60 animate-pulse" />
        <div className="h-9 w-64 rounded-lg bg-slate-800/60 animate-pulse" />
        <div className="h-4 w-48 rounded bg-slate-800/60 animate-pulse" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800/50 bg-[#1c262f] p-4 space-y-2 animate-pulse"
          >
            <div className="h-3 w-14 rounded bg-slate-800/60" />
            <div className="h-6 w-16 rounded bg-slate-800/60" />
          </div>
        ))}
      </div>

      {/* Sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-800/50 bg-[#1c262f] p-4 space-y-2 animate-pulse"
        >
          <div className="h-5 w-32 rounded bg-slate-800/60" />
          <div className="h-4 w-full rounded bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}

/* ── Structure Card ── */

function StructureCard({
  label,
  content,
  borderColor,
  icon,
}: {
  label: string;
  content: string | undefined | null;
  borderColor: string;
  icon: string;
}) {
  if (!content) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800/50 bg-[#1c262f] p-4',
        'border-l-[3px]',
        borderColor,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-base text-slate-400">{icon}</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
        {content}
      </p>
    </div>
  );
}

/* ── Send to Watch Button ── */

function SendToWatchButton({
  workoutId,
  alreadySent,
}: {
  workoutId: string;
  alreadySent: boolean;
}) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [sentSuccess, setSentSuccess] = useState(alreadySent);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>(`/api/plan/send-to-watch/${workoutId}`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      setSentSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
    },
  });

  if (sentSuccess) {
    return (
      <Button variant="secondary" fullWidth disabled className="gap-2">
        <span className="material-symbols-outlined text-lg">check</span>
        Enviado
      </Button>
    );
  }

  if (mutation.isError) {
    return (
      <Button
        variant="danger"
        fullWidth
        onClick={() => mutation.mutate()}
        loading={mutation.isPending}
        className="gap-2"
      >
        <span className="material-symbols-outlined text-lg">error</span>
        Tentar novamente
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      fullWidth
      onClick={() => mutation.mutate()}
      loading={mutation.isPending}
      className="gap-2 uppercase tracking-wide"
    >
      <span className="material-symbols-outlined text-lg">watch</span>
      ENVIAR AO RELOGIO
    </Button>
  );
}

/* ── Nutrition Detail Panel ── */

function NutritionDetailPanel({ items }: { items: NutritionItem[] }) {
  const [expanded, setExpanded] = useState(false);

  const phases = [
    { key: 'pre', label: 'Pre-treino' },
    { key: 'during', label: 'Durante' },
    { key: 'post', label: 'Pos-treino' },
  ];

  const grouped = phases
    .map((p) => ({
      ...p,
      items: items.filter((it) => it.phase === p.key),
    }))
    .filter((p) => p.items.length > 0);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5',
          'text-[13px] font-semibold text-primary',
          'hover:text-primary-bright transition-colors mt-3',
        )}
      >
        {expanded ? 'Ocultar detalhes' : 'Ver protocolo completo'}
        <span className="material-symbols-outlined text-sm">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 mt-4 animate-fade-in">
          {grouped.map((group) => (
            <div key={group.key}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-[#283139] rounded-xl p-3 flex items-start justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {item.product}
                      </p>
                      <p className="font-[var(--font-mono)] text-[11px] text-slate-500 mt-0.5">
                        {item.minuteOffset > 0 ? '+' : ''}
                        {item.minuteOffset}min
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {item.carbsG != null && (
                        <span className="font-[var(--font-mono)] text-[11px] text-slate-400">
                          {item.carbsG}g carb
                        </span>
                      )}
                      {item.kcal != null && (
                        <span className="font-[var(--font-mono)] text-[11px] text-slate-400">
                          {item.kcal}kcal
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */

export default function TreinoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const workoutId = params.id;

  const { data, isLoading, isError } = useQuery<WorkoutDetail>({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const res = await apiFetch<{ data: WorkoutDetail }>(`/api/plan/workout/${workoutId}`, {
        token: token ?? undefined,
      });
      return res.data;
    },
    enabled: !!token && !!workoutId,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>(`/api/plan/workout/${workoutId}/complete`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-workouts'] });
    },
  });

  /* ── Loading ── */
  if (isLoading) {
    return <WorkoutDetailSkeleton />;
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <div className="pt-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Voltar
        </button>
        <AlertBanner variant="danger">
          Nao foi possivel carregar os detalhes do treino.
        </AlertBanner>
      </div>
    );
  }

  const discipline = data.discipline as 'swim' | 'bike' | 'run' | 'brick';
  const distanceFormatted = formatDistance(data.distanceM);

  const timelineItems =
    data.nutritionProtocol?.items.map((it) => ({
      phase: it.phase as 'pre' | 'during' | 'post',
      minuteOffset: it.minuteOffset,
      product: it.product,
      detail: it.carbsG != null ? `${it.carbsG}g carb` : undefined,
    })) ?? [];

  return (
    <div className="space-y-6 pt-4 pb-28">
      {/* ── Fixed Top Nav ── */}
      <div
        className="flex items-center justify-between animate-fade-in-up stagger-1"
        style={{ opacity: 0 }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c262f] border border-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-[#283139] transition-colors"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Detalhes do Treino
        </span>
        <button
          onClick={async () => {
            const shareData = { title: data.title, text: `Treino: ${data.title}`, url: window.location.href };
            try {
              if (navigator.share) await navigator.share(shareData);
              else await navigator.clipboard.writeText(window.location.href);
            } catch {
              /* usuário cancelou ou indisponível */
            }
          }}
          aria-label="Compartilhar treino"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c262f] border border-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-[#283139] transition-colors"
        >
          <span className="material-symbols-outlined text-xl">share</span>
        </button>
      </div>

      {/* ── Header ── */}
      <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <DisciplineBadge discipline={discipline} size="md" className="mb-3" />
        <h1 className="font-[var(--font-heading)] text-3xl font-bold text-slate-100 leading-tight">
          {data.title}
        </h1>
        <div className="flex items-center gap-2 mt-2 text-slate-400">
          <span className="material-symbols-outlined text-base">calendar_today</span>
          <span className="text-sm capitalize">{formatDate(data.scheduledDate)}</span>
        </div>
        {data.description && (
          <p className="text-sm text-slate-500 mt-2">
            {data.description}
          </p>
        )}
      </div>

      {/* ── Stats Grid: 3 cols ── */}
      <div
        className="grid grid-cols-3 gap-3 animate-fade-in-up stagger-2"
        style={{ opacity: 0 }}
      >
        <div className="rounded-xl border border-slate-800/50 bg-[#1c262f] p-4 text-center">
          <span className="material-symbols-outlined text-base text-slate-500 mb-1 block">
            timer
          </span>
          <p className="font-[var(--font-mono)] font-bold text-xl text-slate-100">
            {formatDuration(data.durationMin)}
          </p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">
            Duracao
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/50 bg-[#1c262f] p-4 text-center">
          <span className="material-symbols-outlined text-base text-slate-500 mb-1 block">
            straighten
          </span>
          <p className="font-[var(--font-mono)] font-bold text-xl text-slate-100">
            {distanceFormatted ?? '--'}
          </p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">
            Distancia
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/50 bg-[#1c262f] p-4 text-center">
          <span className="material-symbols-outlined text-base text-slate-500 mb-1 block">
            speed
          </span>
          <p className="font-[var(--font-mono)] font-bold text-xl text-slate-100">
            {data.intensityZone ?? '--'}
          </p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">
            Zona
          </p>
        </div>
      </div>

      {/* ── Structure Section ── */}
      {data.structure && (
        <div
          className="space-y-3 animate-fade-in-up stagger-3"
          style={{ opacity: 0 }}
        >
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Estrutura
          </p>
          <StructureCard
            label="Aquecimento"
            content={data.structure.warmup}
            borderColor="border-l-emerald-500"
            icon="wb_sunny"
          />
          <StructureCard
            label="Principal"
            content={data.structure.main}
            borderColor="border-l-primary"
            icon="fitness_center"
          />
          <StructureCard
            label="Desaquecimento"
            content={data.structure.cooldown}
            borderColor="border-l-blue-300"
            icon="ac_unit"
          />
        </div>
      )}

      {/* ── Nutrition (sugestao intratreino default + log) ── */}
      <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
        <IntraWorkoutSuggestionCard workoutId={data.id} durationMin={data.durationMin} />
      </div>

      {/* ── Fixed Bottom Action Buttons ── */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#101a22] via-[#101a22] to-transparent"
      >
        <div className="max-w-lg mx-auto space-y-2">
          <SendToWatchButton workoutId={data.id} alreadySent={data.sentToWatch} />

          <Button
            variant="ghost"
            fullWidth
            onClick={() => completeMutation.mutate()}
            loading={completeMutation.isPending}
            disabled={completeMutation.isSuccess}
            className="gap-2"
          >
            {completeMutation.isSuccess ? (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Concluido
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Marcar como concluido
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
