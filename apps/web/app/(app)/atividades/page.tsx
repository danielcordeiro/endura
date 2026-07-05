'use client';

import { useState, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActivityRow } from '@/components/ui/activity-row';
import { AlertBanner } from '@/components/ui/alert-banner';

/* ---------- Types ---------- */

type Discipline = 'swim' | 'bike' | 'run' | 'brick';
type Period = '7d' | '30d' | '90d';
type DisciplineFilter = 'all' | Discipline;

interface ActivityItem {
  id: string;
  title: string;
  discipline: string;
  date: string;
  duration: string;
  distance?: string;
  hasNutrition: boolean;
}

interface ActivitiesPage {
  data: ActivityItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/* ---------- Constants ---------- */

const periodOptions: { value: Period; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

const disciplineOptions: { value: DisciplineFilter; label: string; icon?: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'swim', label: 'Swim', icon: 'pool' },
  { value: 'bike', label: 'Bike', icon: 'directions_bike' },
  { value: 'run', label: 'Run', icon: 'directions_run' },
];

/* ---------- Helpers ---------- */

function groupByMonth(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};
  for (const act of activities) {
    if (!act.date) continue;
    const key = format(parseISO(act.date), 'MMMM yyyy', { locale: ptBR });
    if (!groups[key]) groups[key] = [];
    groups[key].push(act);
  }
  return groups;
}

/* ---------- Skeleton ---------- */

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-surface border border-border animate-pulse">
      <div className="w-12 h-12 rounded-full bg-bg-elevated shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 w-3/5 rounded-lg bg-bg-elevated" />
        <div className="h-3 w-2/5 rounded-lg bg-bg-elevated" />
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="h-4 w-12 rounded-lg bg-bg-elevated" />
        <div className="h-3 w-10 rounded-lg bg-bg-elevated" />
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function AtividadesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<Period>('30d');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');

  /* Infinite query */
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ActivitiesPage>({
    queryKey: ['activities', period, discipline],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        period,
        page: String(pageParam),
        limit: '20',
      });
      if (discipline !== 'all') params.set('type', discipline);
      return apiFetch<ActivitiesPage>(`/api/activities?${params.toString()}`, {
        token: token ?? undefined,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    enabled: !!token,
  });

  /* Manual sync */
  const syncMutation = useMutation({
    mutationFn: (force?: boolean) =>
      apiFetch(`/api/integrations/strava/sync${force ? '?force=true' : ''}`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  /* Flatten all pages */
  const allActivities = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const grouped = useMemo(() => groupByMonth(allActivities), [allActivities]);

  const handleActivityClick = useCallback(
    (id: string) => {
      router.push(`/atividades/${id}`);
    },
    [router],
  );

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl text-text-primary tracking-tight">
          Atividades
        </h1>
        <button
          onClick={() => router.push('/configuracoes')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>

      {/* Period segmented control */}
      <div className="segmented h-12" role="tablist" aria-label="Período de atividades">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            role="tab"
            aria-selected={period === opt.value}
            data-active={period === opt.value}
            className="segmented-item"
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Discipline pill filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {disciplineOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDiscipline(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 whitespace-nowrap shrink-0',
              discipline === opt.value
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-elevated hover:text-text-primary',
            )}
          >
            {opt.icon && (
              <span className={cn(
                'material-symbols-outlined text-[16px]',
                discipline === opt.value ? 'text-primary' : 'text-text-muted',
              )}>
                {opt.icon}
              </span>
            )}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {isError && (
        <AlertBanner variant="danger">
          {(error as { message?: string })?.message ?? 'Erro ao carregar atividades.'}
        </AlertBanner>
      )}

      {/* Sync alerts */}
      {syncMutation.isError && (
        <AlertBanner variant="danger">
          {(syncMutation.error as { message?: string })?.message ?? 'Erro ao sincronizar com Strava. Tente novamente.'}
        </AlertBanner>
      )}
      {syncMutation.isSuccess && (
        <AlertBanner variant="success">
          Sincronizacao concluida com sucesso.
        </AlertBanner>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Activities grouped by month */}
      {!isLoading && allActivities.length > 0 && (
        <div className="space-y-2">
          {Object.entries(grouped).map(([month, activities]) => (
            <Fragment key={month}>
              {/* Sticky month header */}
              <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-bg-base/85 backdrop-blur-md">
                <h2 className="font-heading font-semibold text-[12px] text-text-muted uppercase tracking-[0.12em]">
                  {month}
                </h2>
              </div>

              <div className="space-y-2">
                {activities.map((act) => (
                  <ActivityRow
                    key={act.id}
                    title={act.title}
                    discipline={act.discipline}
                    date={act.date}
                    duration={act.duration}
                    distance={act.distance}
                    hasNutrition={act.hasNutrition}
                    onClick={() => handleActivityClick(act.id)}
                  />
                ))}
              </div>
            </Fragment>
          ))}

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="ghost"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
                className="h-11 text-[13px] rounded-full"
              >
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allActivities.length === 0 && !isError && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-bg-surface border border-border flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-text-muted">
              directions_run
            </span>
          </div>
          <div className="text-center space-y-2">
            <p className="font-heading font-bold text-lg text-text-primary">
              Nenhuma atividade
            </p>
            <p className="font-body text-sm text-text-muted max-w-[260px]">
              Conecte o Strava nas configuracoes para importar seus treinos automaticamente.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => syncMutation.mutate(true)}
            loading={syncMutation.isPending}
            className="h-11 text-[13px] px-6 rounded-full"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Sincronizar manualmente
          </Button>
        </div>
      )}

      {/* Sync button — full-width pill like Stitch design */}
      {!isLoading && allActivities.length > 0 && (
        <div className="pb-2">
          <button
            onClick={() => syncMutation.mutate(false)}
            disabled={syncMutation.isPending}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 h-14 rounded-full',
              'bg-primary text-white font-bold text-sm',
              'shadow-lg shadow-primary/25',
              'hover:bg-primary-hover transition-all duration-200',
              'active:scale-[0.98]',
              'disabled:opacity-50',
            )}
          >
            <span className={cn(
              'material-symbols-outlined text-xl',
              syncMutation.isPending && 'animate-spin',
            )}>
              sync
            </span>
            Sincronizar Manualmente
          </button>
        </div>
      )}
    </div>
  );
}
