'use client';

import { useState, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Waves, Bike, Footprints, Inbox, Activity } from 'lucide-react';
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

interface ActivityItem {
  id: string;
  title: string;
  discipline: Discipline;
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
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

const disciplineOptions: { value: DisciplineFilter; label: string; icon?: typeof Waves; color?: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'swim', label: 'Swim', icon: Waves, color: 'text-swim' },
  { value: 'bike', label: 'Bike', icon: Bike, color: 'text-bike' },
  { value: 'run', label: 'Run', icon: Footprints, color: 'text-run' },
];

/* ---------- Helpers ---------- */

function groupByMonth(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};
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
    <div className="flex items-center gap-3 p-4 card animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-bg-elevated shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/5 rounded bg-bg-elevated" />
        <div className="h-3 w-2/5 rounded bg-bg-elevated" />
      </div>
    </div>
  );
}

/* ---------- Filter chip ---------- */

function FilterChip({
  active,
  onClick,
  children,
  icon: Icon,
  iconColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: typeof Waves;
  iconColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-body text-[13px] font-medium transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-primary/15 text-primary border border-primary/25'
          : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-elevated hover:text-text-primary',
      )}
    >
      {Icon && <Icon size={14} className={active ? 'text-primary' : iconColor} />}
      {children}
    </button>
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
    <div className="py-6 space-y-5">
      {/* Title */}
      <h1 className="font-heading font-bold text-[28px] text-text-primary tracking-tight">
        Atividades
      </h1>

      {/* Filters */}
      <div className="space-y-3">
        {/* Period filter */}
        <div className="flex gap-2">
          {periodOptions.map((opt) => (
            <FilterChip
              key={opt.value}
              active={period === opt.value}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>

        {/* Discipline filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {disciplineOptions.map((opt) => (
            <FilterChip
              key={opt.value}
              active={discipline === opt.value}
              onClick={() => setDiscipline(opt.value)}
              icon={opt.icon}
              iconColor={opt.color}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>
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
          Erro ao sincronizar com Strava. Tente novamente.
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
        <div className="space-y-5">
          {Object.entries(grouped).map(([month, activities]) => (
            <Fragment key={month}>
              {/* Month header */}
              <div className="sticky top-0 z-10 -mx-5 px-5 py-2 bg-bg-base/90 backdrop-blur-sm">
                <h2 className="font-heading font-semibold text-[13px] text-text-muted uppercase tracking-[0.1em]">
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
                className="h-10 text-[13px]"
              >
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allActivities.length === 0 && !isError && (
        <div className="flex flex-col items-center justify-center py-20 space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-bg-surface border border-border flex items-center justify-center">
            <Activity size={36} className="text-text-muted" strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-1.5">
            <p className="font-heading font-bold text-[18px] text-text-primary">
              Nenhuma atividade
            </p>
            <p className="font-body text-[14px] text-text-muted max-w-[260px]">
              Conecte o Strava nas configuracoes para importar seus treinos automaticamente.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            loading={syncMutation.isPending}
            className="h-10 text-[12px] px-5"
          >
            <RefreshCw size={14} />
            Sincronizar manualmente
          </Button>
        </div>
      )}

      {/* Manual sync button (when has activities) */}
      {!isLoading && allActivities.length > 0 && (
        <div className="flex justify-center pb-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="font-body text-[13px] text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} />
            Sincronizar
          </button>
        </div>
      )}
    </div>
  );
}
