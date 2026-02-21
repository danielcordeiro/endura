'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight } from 'lucide-react';
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

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatDayMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
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
    <div className="space-y-6 pt-6 pb-6">
      <div className="space-y-2">
        <div className="skeleton h-7 w-48 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-bg-surface border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="skeleton h-4 w-36 rounded" />
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

  const { data, isLoading, isError } = useQuery<WeeklyPlan>({
    queryKey: ['weekly-workouts'],
    queryFn: () =>
      apiFetch<WeeklyPlan>('/api/plan/week/current', {
        token: token ?? undefined,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  /* ── Loading ── */
  if (isLoading) {
    return <WeeklyPlanSkeleton />;
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <div className="pt-6 space-y-4">
        <h1 className="font-heading text-[28px] font-bold text-text-primary">
          Plano Semanal
        </h1>
        <AlertBanner variant="danger">
          Nao foi possivel carregar o plano semanal. Verifique sua conexao e tente novamente.
        </AlertBanner>
      </div>
    );
  }

  const { weekNumber, phase, startDate, endDate, workouts } = data;

  // Sort workouts by scheduledDate
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
  );

  return (
    <div className="space-y-6 pt-6 pb-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={18} className="text-primary" />
          <span
            className={cn(
              'inline-block px-2.5 py-1 rounded-full',
              'font-body text-[11px] font-semibold uppercase tracking-[0.08em]',
              'bg-primary/15 text-primary',
            )}
          >
            {phase}
          </span>
        </div>
        <h1 className="font-heading text-[28px] font-bold text-text-primary leading-tight">
          Semana {weekNumber}
        </h1>
        <p className="font-body text-[14px] text-text-secondary mt-1">
          {formatDayMonth(startDate)} a {formatDayMonth(endDate)}
        </p>
      </div>

      {/* ── Workout List ── */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="bg-bg-surface border border-border rounded-lg p-6 text-center">
            <p className="font-body text-[14px] text-text-muted">
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
                'flex items-center gap-3 w-full text-left p-4 rounded-lg',
                'border transition-all duration-150',
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
                    'font-body text-[11px] font-medium uppercase',
                    today ? 'text-primary' : 'text-text-muted',
                  )}
                >
                  {formatWeekday(workout.scheduledDate)}
                </span>
                <span
                  className={cn(
                    'font-mono text-[18px] font-bold',
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
                  today ? 'bg-primary/30' : 'bg-border',
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <DisciplineBadge discipline={discipline} size="sm" />
                  {today && (
                    <span className="font-body text-[10px] font-semibold uppercase tracking-wider text-primary">
                      HOJE
                    </span>
                  )}
                  {workout.completed && (
                    <span className="font-body text-[10px] font-semibold uppercase tracking-wider text-success">
                      CONCLUIDO
                    </span>
                  )}
                </div>
                <p className="font-body font-semibold text-[15px] text-text-primary truncate">
                  {workout.title}
                </p>
                <p className="font-body text-[12px] text-text-secondary mt-0.5">
                  {formatDuration(workout.durationMin)}
                  {workout.distanceM != null && (
                    <> &middot; {formatDistance(workout.distanceM)}</>
                  )}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight size={16} className="text-text-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
