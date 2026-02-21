'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Moon,
  ChevronRight,
  Watch,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { AlertBanner } from '@/components/ui/alert-banner';

/* ── Types ── */

interface DashboardSummary {
  raceGoal: { name: string | null; date: string; daysRemaining: number } | null;
  currentPlan: { phase: string; weekNumber: number; percentComplete: number } | null;
  currentWeek: {
    workoutsPlanned: number;
    workoutsCompleted: number;
    tssEstimate: number;
    volumeHours: number;
  };
  todayWorkout: {
    id: string;
    discipline: string;
    title: string;
    durationMin: number;
    distanceM: number | null;
    structure: { warmup: string; main: string; cooldown: string } | null;
    sentToWatch: boolean;
  } | null;
  alerts: Array<{ type: string; level: string; message: string }>;
}

/* ── Helpers ── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function formatDistance(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

function alertLevelToVariant(level: string): 'warning' | 'success' | 'danger' | 'info' {
  const map: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
    warning: 'warning',
    success: 'success',
    danger: 'danger',
    info: 'info',
  };
  return map[level] ?? 'info';
}

/* ── Skeleton Components ── */

function GreetingSkeleton() {
  return (
    <div className="space-y-2 pt-6 pb-2">
      <div className="skeleton h-5 w-48 rounded" />
      <div className="skeleton h-3 w-32 rounded" />
    </div>
  );
}

function RaceCountdownSkeleton() {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
      <div className="skeleton h-6 w-20 rounded-full" />
      <div className="skeleton h-16 w-28 rounded" />
      <div className="skeleton h-4 w-44 rounded" />
      <div className="skeleton h-2 w-full rounded-full" />
    </div>
  );
}

function TodayWorkoutSkeleton() {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 space-y-3">
      <div className="skeleton h-6 w-20 rounded-full" />
      <div className="skeleton h-5 w-56 rounded" />
      <div className="skeleton h-4 w-36 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="flex gap-3 mt-3">
        <div className="skeleton h-[52px] flex-1 rounded-md" />
        <div className="skeleton h-[52px] w-32 rounded-md" />
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-bg-surface border border-border rounded-lg p-4 space-y-2">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-8 w-12 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      ))}
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  if (sentSuccess) {
    return (
      <Button variant="secondary" disabled className="gap-2">
        <Check size={18} />
        Enviado
      </Button>
    );
  }

  if (mutation.isError) {
    return (
      <Button
        variant="danger"
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
      onClick={() => mutation.mutate()}
      loading={mutation.isPending}
      className="gap-2"
    >
      <Watch size={18} />
      Enviar ao relogio
    </Button>
  );
}

/* ── Page ── */

export default function DashboardPage() {
  const { token, user } = useAuthStore();

  const { data, isLoading, isError } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () =>
      apiFetch<DashboardSummary>('/api/dashboard/summary', {
        token: token ?? undefined,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6 pt-2 pb-6">
        <GreetingSkeleton />
        <RaceCountdownSkeleton />
        <TodayWorkoutSkeleton />
        <StatsGridSkeleton />
      </div>
    );
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <div className="pt-6">
        <AlertBanner variant="danger">
          Nao foi possivel carregar o dashboard. Verifique sua conexao e tente novamente.
        </AlertBanner>
      </div>
    );
  }

  const { raceGoal, currentPlan, currentWeek, todayWorkout, alerts } = data;
  const firstName = user?.name?.split(' ')[0] ?? '';
  const consistency =
    currentWeek.workoutsPlanned > 0
      ? Math.round((currentWeek.workoutsCompleted / currentWeek.workoutsPlanned) * 100)
      : 0;

  return (
    <div className="space-y-6 pt-6 pb-6">
      {/* ── Greeting ── */}
      <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <h1 className="font-heading text-[28px] font-bold text-text-primary leading-tight">
          {getGreeting()}, {firstName}
        </h1>
        {currentPlan && (
          <p className="font-body text-[14px] text-text-secondary mt-1">
            Semana {currentPlan.weekNumber} &middot; Fase {currentPlan.phase}
          </p>
        )}
      </div>

      {/* ── Race Countdown ── */}
      {raceGoal && (
        <div
          className="bg-bg-surface border border-border rounded-lg p-6 animate-fade-in-up stagger-2"
          style={{ opacity: 0 }}
        >
          {currentPlan && (
            <span
              className={cn(
                'inline-block px-3 py-1 rounded-full',
                'font-body text-[11px] font-semibold uppercase tracking-[0.08em]',
                'bg-primary/15 text-primary mb-3',
              )}
            >
              {currentPlan.phase}
            </span>
          )}

          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-[64px] leading-none text-primary">
              {raceGoal.daysRemaining}
            </span>
          </div>

          <p className="font-body text-[15px] text-text-secondary mt-1">
            DIAS para a prova
          </p>

          {raceGoal.name && (
            <p className="font-body text-[13px] text-text-muted mt-0.5">
              {raceGoal.name} &middot;{' '}
              {new Date(raceGoal.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}
            </p>
          )}

          {currentPlan && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-[11px] text-text-muted uppercase tracking-wider">
                  Progresso do plano
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {currentPlan.percentComplete}%
                </span>
              </div>
              <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${currentPlan.percentComplete}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Today's Workout ── */}
      <div
        className="bg-bg-surface border border-border rounded-lg p-5 animate-fade-in-up stagger-3"
        style={{ opacity: 0 }}
      >
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-3">
          Treino de hoje
        </p>

        {todayWorkout ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <DisciplineBadge
                discipline={todayWorkout.discipline as 'swim' | 'bike' | 'run' | 'brick'}
              />
              <h2 className="font-heading text-[20px] font-bold text-text-primary leading-tight">
                {todayWorkout.title}
              </h2>
            </div>

            <p className="font-body text-[14px] text-text-secondary">
              {formatDuration(todayWorkout.durationMin)}
              {todayWorkout.distanceM != null && (
                <> &middot; {formatDistance(todayWorkout.distanceM)}</>
              )}
            </p>

            {todayWorkout.structure && (
              <p className="font-body text-[13px] text-text-muted mt-2 line-clamp-2">
                {todayWorkout.structure.main}
              </p>
            )}

            <div className="flex items-center gap-3 mt-4">
              <Link
                href={`/treino/${todayWorkout.id}`}
                className={cn(
                  'inline-flex items-center gap-1.5',
                  'font-body text-[14px] font-semibold text-primary',
                  'hover:text-primary-hover transition-colors',
                )}
              >
                Ver detalhes
                <ChevronRight size={16} />
              </Link>

              <div className="ml-auto">
                <SendToWatchButton
                  workoutId={todayWorkout.id}
                  alreadySent={todayWorkout.sentToWatch}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-bg-elevated mb-3">
              <Moon size={28} className="text-text-muted" />
            </div>
            <h2 className="font-heading text-[20px] font-bold text-text-primary">
              Dia de descanso
            </h2>
            <p className="font-body text-[14px] text-text-secondary mt-1 max-w-[260px]">
              Aproveite para recuperar. Amanha voce volta mais forte.
            </p>
          </div>
        )}
      </div>

      {/* ── Stat Cards (2x2 grid) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
          <StatCard
            label="TSS Semanal"
            value={currentWeek.tssEstimate}
            unit="tss"
            variant="highlight"
          />
        </div>
        <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
          <StatCard
            label="Treinos"
            value={`${currentWeek.workoutsCompleted}/${currentWeek.workoutsPlanned}`}
            context="concluidos"
          />
        </div>
        <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
          <StatCard
            label="Volume"
            value={currentWeek.volumeHours.toFixed(1)}
            unit="horas"
          />
        </div>
        <div className="animate-fade-in-up stagger-6" style={{ opacity: 0 }}>
          <StatCard
            label="Consistencia"
            value={`${consistency}`}
            unit="%"
            variant={consistency >= 80 ? 'highlight' : consistency >= 50 ? 'warn' : 'danger'}
          />
        </div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-3 animate-fade-in-up stagger-6" style={{ opacity: 0 }}>
          <p className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
            Alertas
          </p>
          {alerts.map((alert, i) => (
            <AlertBanner key={`${alert.type}-${i}`} variant={alertLevelToVariant(alert.level)}>
              {alert.message}
            </AlertBanner>
          ))}
        </div>
      )}
    </div>
  );
}
