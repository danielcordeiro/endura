'use client';

import { useState, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Waves, Bike, Footprints, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActivityRow } from '@/components/ui/activity-row';
import { AlertBanner } from '@/components/ui/alert-banner';

/* ---------- Types ---------- */

type Discipline = 'swim' | 'bike' | 'run' | 'brick';
type Period = '7' | '30' | '90';
type DisciplineFilter = 'all' | Discipline;

interface Activity {
  id: string;
  title: string;
  discipline: Discipline;
  date: string;
  duration: string;
  distance?: string;
  hasNutrition: boolean;
}

interface ActivitiesPage {
  data: Activity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/* ---------- Constants ---------- */

const periodOptions: { value: Period; label: string }[] = [
  { value: '7', label: '7 DIAS' },
  { value: '30', label: '30 DIAS' },
  { value: '90', label: '90D' },
];

const disciplineOptions: { value: DisciplineFilter; label: string; icon?: typeof Waves }[] = [
  { value: 'all', label: 'TODOS' },
  { value: 'swim', label: 'SWIM', icon: Waves },
  { value: 'bike', label: 'BIKE', icon: Bike },
  { value: 'run', label: 'RUN', icon: Footprints },
];

/* ---------- Helpers ---------- */

function groupByMonth(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  for (const act of activities) {
    const key = format(parseISO(act.date), 'MMMM yyyy', { locale: ptBR });
    if (!groups[key]) groups[key] = [];
    groups[key].push(act);
  }
  return groups;
}

/* ---------- Skeleton ---------- */

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-surface border border-border animate-pulse">
      <div className="w-10 h-10 rounded-full bg-bg-elevated shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/5 rounded bg-bg-elevated" />
        <div className="h-3 w-2/5 rounded bg-bg-elevated" />
        <div className="h-2 w-1/4 rounded bg-bg-elevated" />
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function AtividadesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<Period>('30');
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
    mutationFn: () =>
      apiFetch('/api/integrations/strava/sync', {
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
    <div className="py-6 space-y-6">
      {/* Title */}
      <h1 className="font-heading font-bold text-[28px] text-text-primary">Atividades</h1>

      {/* Period filter */}
      <div className="flex gap-2">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={cn(
              'px-4 py-2 rounded-full font-body text-[13px] font-semibold uppercase tracking-wider transition-colors',
              period === opt.value
                ? 'bg-primary text-text-inverse'
                : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-elevated',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Discipline filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {disciplineOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => setDiscipline(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-[12px] font-medium uppercase tracking-wider transition-colors whitespace-nowrap',
                discipline === opt.value
                  ? 'bg-primary text-text-inverse'
                  : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-elevated',
              )}
            >
              {Icon && <Icon size={14} />}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {isError && (
        <AlertBanner variant="danger">
          {(error as { message?: string })?.message ?? 'Erro ao carregar atividades.'}
        </AlertBanner>
      )}

      {/* Sync error */}
      {syncMutation.isError && (
        <AlertBanner variant="danger">
          Erro ao sincronizar com Strava. Tente novamente.
        </AlertBanner>
      )}

      {/* Sync success */}
      {syncMutation.isSuccess && (
        <AlertBanner variant="success">
          Sincronizacao concluida com sucesso.
        </AlertBanner>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Activities grouped by month */}
      {!isLoading && allActivities.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, activities]) => (
            <Fragment key={month}>
              {/* Sticky month header */}
              <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-bg-base/90 backdrop-blur-sm">
                <h2 className="font-heading font-semibold text-[16px] text-text-secondary uppercase tracking-wider">
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
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allActivities.length === 0 && !isError && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-bg-surface flex items-center justify-center">
            <Inbox size={32} className="text-text-muted" />
          </div>
          <p className="font-body text-[15px] text-text-secondary text-center max-w-[260px]">
            Nenhuma atividade encontrada. Conecte o Strava para importar.
          </p>
        </div>
      )}

      {/* Manual sync button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="ghost"
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
        >
          <RefreshCw size={16} />
          Sincronizar manualmente
        </Button>
      </div>
    </div>
  );
}
