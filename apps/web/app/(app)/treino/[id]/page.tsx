'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Watch,
  Check,
  AlertCircle,
  Clock,
  Route,
  Gauge,
  Droplets,
  Zap,
  Flame,
  Pill,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { NutritionTimeline } from '@/components/ui/nutrition-timeline';

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
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/* ── Skeleton ── */

function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6 pt-4 pb-6">
      {/* Back button */}
      <div className="skeleton h-5 w-24 rounded" />

      {/* Badge + title */}
      <div className="space-y-3">
        <div className="skeleton h-7 w-20 rounded-full" />
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-4 w-48 rounded" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-surface border border-border rounded-lg p-4 space-y-2">
            <div className="skeleton h-3 w-14 rounded" />
            <div className="skeleton h-6 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-bg-surface border border-border rounded-lg p-4 space-y-2">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-4 w-full rounded" />
        </div>
      ))}

      {/* Buttons */}
      <div className="skeleton h-[52px] w-full rounded-md" />
      <div className="skeleton h-[52px] w-full rounded-md" />
    </div>
  );
}

/* ── Collapsible Section ── */

function CollapsibleSection({
  title,
  content,
  defaultOpen = false,
}: {
  title: string;
  content: string | undefined | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full p-4',
          'hover:bg-bg-elevated transition-colors duration-150',
        )}
      >
        <span className="font-heading text-[16px] font-bold text-text-primary">
          {title}
        </span>
        {open ? (
          <ChevronUp size={18} className="text-text-muted" />
        ) : (
          <ChevronDown size={18} className="text-text-muted" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <p className="font-body text-[14px] text-text-secondary whitespace-pre-line leading-relaxed">
            {content}
          </p>
        </div>
      )}
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
        <Check size={18} />
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
        <AlertCircle size={18} />
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
      className="gap-2"
    >
      <Watch size={18} />
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
          'font-body text-[13px] font-semibold text-primary',
          'hover:text-primary-hover transition-colors mt-3',
        )}
      >
        {expanded ? 'Ocultar detalhes' : 'Ver protocolo completo'}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="space-y-4 mt-4 animate-fade-in">
          {grouped.map((group) => (
            <div key={group.key}>
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-2">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-bg-elevated rounded-lg p-3 flex items-start justify-between"
                  >
                    <div>
                      <p className="font-body text-[14px] font-medium text-text-primary">
                        {item.product}
                      </p>
                      <p className="font-mono text-[11px] text-text-muted mt-0.5">
                        {item.minuteOffset > 0 ? '+' : ''}
                        {item.minuteOffset}min
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {item.carbsG != null && (
                        <span className="font-mono text-[11px] text-text-secondary">
                          {item.carbsG}g carb
                        </span>
                      )}
                      {item.kcal != null && (
                        <span className="font-mono text-[11px] text-text-secondary">
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
    queryFn: () =>
      apiFetch<WorkoutDetail>(`/api/plan/workout/${workoutId}`, {
        token: token ?? undefined,
      }),
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
          className="inline-flex items-center gap-1 font-body text-[14px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>
        <div className="bg-danger-dim border-l-3 border-l-danger rounded-lg p-4">
          <p className="font-body text-[14px] text-text-primary">
            Nao foi possivel carregar os detalhes do treino.
          </p>
        </div>
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
    <div className="space-y-6 pt-4 pb-6">
      {/* ── Back Button ── */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 font-body text-[14px] text-text-secondary hover:text-text-primary transition-colors animate-fade-in-up stagger-1"
        style={{ opacity: 0 }}
      >
        <ChevronLeft size={18} />
        Voltar
      </button>

      {/* ── Header ── */}
      <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <DisciplineBadge discipline={discipline} size="md" className="mb-3" />
        <h1 className="font-heading text-[28px] font-bold text-text-primary leading-tight">
          {data.title}
        </h1>
        <p className="font-body text-[14px] text-text-secondary mt-1 capitalize">
          {formatDate(data.scheduledDate)}
        </p>
        {data.description && (
          <p className="font-body text-[14px] text-text-muted mt-2">
            {data.description}
          </p>
        )}
      </div>

      {/* ── Stat Row: 3 cards ── */}
      <div
        className="grid grid-cols-3 gap-3 animate-fade-in-up stagger-2"
        style={{ opacity: 0 }}
      >
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <Clock size={16} className="mx-auto text-text-muted mb-1" />
          <p className="font-mono font-bold text-[20px] text-text-primary">
            {formatDuration(data.durationMin)}
          </p>
          <p className="font-body text-[11px] text-text-muted uppercase tracking-wider">
            Duracao
          </p>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <Route size={16} className="mx-auto text-text-muted mb-1" />
          <p className="font-mono font-bold text-[20px] text-text-primary">
            {distanceFormatted ?? '--'}
          </p>
          <p className="font-body text-[11px] text-text-muted uppercase tracking-wider">
            Distancia
          </p>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <Gauge size={16} className="mx-auto text-text-muted mb-1" />
          <p className="font-mono font-bold text-[20px] text-text-primary">
            {data.intensityZone ?? '--'}
          </p>
          <p className="font-body text-[11px] text-text-muted uppercase tracking-wider">
            Zona
          </p>
        </div>
      </div>

      {/* ── Structure Sections ── */}
      {data.structure && (
        <div
          className="space-y-3 animate-fade-in-up stagger-3"
          style={{ opacity: 0 }}
        >
          <CollapsibleSection
            title="Aquecimento"
            content={data.structure.warmup}
            defaultOpen
          />
          <CollapsibleSection
            title="Principal"
            content={data.structure.main}
            defaultOpen
          />
          <CollapsibleSection
            title="Desaquecimento"
            content={data.structure.cooldown}
          />
        </div>
      )}

      {/* ── Nutrition ── */}
      {data.nutritionProtocol && data.nutritionProtocol.items.length > 0 && (
        <div
          className="animate-fade-in-up stagger-4"
          style={{ opacity: 0 }}
        >
          <p className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-3">
            Nutricao
          </p>

          {/* Summary row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-text-muted" />
              <span className="font-mono text-[12px] text-text-secondary">
                {data.nutritionProtocol.totalCarbsG}g carbs
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets size={14} className="text-text-muted" />
              <span className="font-mono text-[12px] text-text-secondary">
                {data.nutritionProtocol.totalSodiumMg}mg sodio
              </span>
            </div>
            {data.nutritionProtocol.totalCaffeineMg > 0 && (
              <div className="flex items-center gap-1.5">
                <Pill size={14} className="text-text-muted" />
                <span className="font-mono text-[12px] text-text-secondary">
                  {data.nutritionProtocol.totalCaffeineMg}mg cafeina
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-text-muted" />
              <span className="font-mono text-[12px] text-text-secondary">
                {data.nutritionProtocol.totalKcal}kcal
              </span>
            </div>
          </div>

          <NutritionTimeline items={timelineItems} />

          <NutritionDetailPanel items={data.nutritionProtocol.items} />
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div
        className="space-y-3 animate-fade-in-up stagger-5"
        style={{ opacity: 0 }}
      >
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
              <Check size={18} />
              Concluido
            </>
          ) : (
            <>
              <Check size={18} />
              Marcar como concluido
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
