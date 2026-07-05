'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { AlertBanner } from '@/components/ui/alert-banner';

/* ── Types ── */

interface WeeklyWorkout {
  id: string;
  discipline: string;
  title: string;
  scheduledDate: string;
  durationMin: number;
  distanceM: number | null;
  completed: boolean;
  sentToWatch: boolean;
}

interface WeeklyPlan {
  weekNumber: number;
  phase: string;
  startDate: string;
  endDate: string;
  totalWeeks: number | null;
  workouts: WeeklyWorkout[];
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
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

// Interpreta 'YYYY-MM-DD' como data local (nao UTC), para nao ter shift por timezone.
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function formatWeekday(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatDayMonth(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function isToday(dateStr: string): boolean {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/* ── Skeleton ── */

function WeeklyPlanSkeleton() {
  return (
    <div className="space-y-8 pt-6 pb-6">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full bg-bg-elevated/60 animate-pulse" />
        <div className="h-8 w-48 rounded-lg bg-bg-elevated/60 animate-pulse" />
        <div className="h-4 w-32 rounded bg-bg-elevated/60 animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-bg-surface p-4 space-y-2 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 rounded-full bg-bg-elevated/60" />
              <div className="h-5 w-48 rounded bg-bg-elevated/60" />
            </div>
            <div className="h-4 w-36 rounded bg-bg-elevated/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ── */

export default function TreinoPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  // null = semana atual; numero = semana especifica do plano.
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<WeeklyPlan>({
    queryKey: ['weekly-workouts', selectedWeek],
    queryFn: () =>
      apiFetch<WeeklyPlan>(
        selectedWeek == null
          ? '/api/plan/week/current'
          : `/api/plan/week/${selectedWeek}`,
        { token: token ?? undefined },
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
    // Mantem a semana anterior na tela enquanto carrega a nova (sem flash de skeleton).
    placeholderData: (prev) => prev,
  });

  /* ── Loading ── */
  if (isLoading) {
    return <WeeklyPlanSkeleton />;
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <div className="pt-6 space-y-4">
        <h1 className="font-[var(--font-heading)] text-[28px] font-bold text-text-primary">
          Plano Semanal
        </h1>
        <AlertBanner variant="danger">
          Nao foi possivel carregar o plano semanal. Verifique sua conexao e tente novamente.
        </AlertBanner>
      </div>
    );
  }

  const { weekNumber, phase, startDate, endDate, totalWeeks, workouts } = data;

  // Navegacao so faz sentido quando ha plano ativo (totalWeeks definido).
  const canPrev = totalWeeks != null && weekNumber > 1;
  const canNext = totalWeeks != null && weekNumber < totalWeeks;

  // Sort workouts by scheduledDate
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
  );

  return (
    <div className="space-y-8 pt-6 pb-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <div className="flex items-center gap-2.5 mb-2">
          <span className="material-symbols-outlined text-lg text-primary">calendar_month</span>
          <span
            className={cn(
              'inline-block px-2.5 py-1 rounded-full',
              'text-[11px] font-bold uppercase tracking-widest',
              'bg-primary/15 text-primary',
            )}
          >
            {phase}
          </span>
          {selectedWeek != null && (
            <button
              onClick={() => setSelectedWeek(null)}
              className="ml-auto text-[11px] font-bold uppercase tracking-wider text-text-secondary hover:text-primary transition-colors"
            >
              Hoje
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => canPrev && setSelectedWeek(weekNumber - 1)}
            disabled={!canPrev}
            aria-label="Semana anterior"
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border transition-all',
              canPrev
                ? 'text-text-primary hover:bg-bg-elevated active:scale-95'
                : 'text-text-faint opacity-40 cursor-not-allowed',
            )}
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>

          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-text-primary leading-tight">
              Semana {weekNumber}
              {totalWeeks != null && (
                <span className="text-xl font-semibold text-text-muted"> / {totalWeeks}</span>
              )}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {formatDayMonth(startDate)} a {formatDayMonth(endDate)}
            </p>
          </div>

          <button
            onClick={() => canNext && setSelectedWeek(weekNumber + 1)}
            disabled={!canNext}
            aria-label="Proxima semana"
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border transition-all',
              canNext
                ? 'text-text-primary hover:bg-bg-elevated active:scale-95'
                : 'text-text-faint opacity-40 cursor-not-allowed',
            )}
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      </div>

      {/* ── Section label ── */}
      <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">
        Treinos da semana
      </p>

      {/* ── Workout List ── */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-text-muted mb-2">
              event_busy
            </span>
            <p className="text-sm text-text-muted">
              Nenhum treino programado para esta semana.
            </p>
          </div>
        )}

        {sorted.map((workout, index) => {
          const today = isToday(workout.scheduledDate);
          const past = isPast(workout.scheduledDate);
          const discipline = workout.discipline as 'swim' | 'bike' | 'run' | 'brick';

          return (
            <button
              key={workout.id}
              onClick={() => router.push(`/treino/${workout.id}`)}
              className={cn(
                'flex items-center gap-3 w-full text-left p-4 rounded-2xl',
                'border transition-all duration-200',
                'hover:bg-bg-elevated active:scale-[0.99]',
                'animate-fade-in-up',
                today
                  ? 'bg-bg-surface border-primary/40 ring-1 ring-primary/20'
                  : 'bg-bg-surface border-border',
                workout.completed && 'opacity-60',
              )}
              style={{
                opacity: 0,
                animationDelay: `${(index + 1) * 40}ms`,
              }}
            >
              {/* Day column */}
              <div className="flex flex-col items-center w-12 shrink-0">
                <span
                  className={cn(
                    'text-[11px] font-medium uppercase',
                    today ? 'text-primary' : 'text-text-muted',
                  )}
                >
                  {formatWeekday(workout.scheduledDate)}
                </span>
                <span
                  className={cn(
                    'font-[var(--font-mono)] text-lg font-bold',
                    today ? 'text-primary' : 'text-text-primary',
                  )}
                >
                  {new Date(workout.scheduledDate).getDate()}
                </span>
              </div>

              {/* Separator */}
              <div
                className={cn(
                  'w-px h-10 shrink-0',
                  today ? 'bg-primary/30' : 'bg-bg-elevated/50',
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <DisciplineBadge discipline={discipline} size="sm" />
                  {today && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      HOJE
                    </span>
                  )}
                  {workout.completed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      CONCLUIDO
                    </span>
                  )}
                </div>
                <p className="font-semibold text-[15px] text-text-primary truncate">
                  {workout.title}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">timer</span>
                    {formatDuration(workout.durationMin)}
                  </span>
                  {workout.distanceM != null && (
                    <>
                      {' '}&middot;{' '}
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">straighten</span>
                        {formatDistance(workout.distanceM)}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Chevron */}
              <span className="material-symbols-outlined text-lg text-text-muted shrink-0">
                chevron_right
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
