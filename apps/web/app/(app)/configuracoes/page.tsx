'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Trophy,
  RefreshCw,
  Unlink,
  ChevronRight,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';

/* ---------- Types ---------- */

interface IntegrationStatus {
  data: {
    connected: boolean;
    lastSync?: string;
    athleteName?: string;
    authUrl?: string;
  };
}

interface RaceGoal {
  data: {
    raceName: string;
    raceDate: string;
  } | null;
}

/* ---------- Skeleton ---------- */

function SettingsSkeleton() {
  return (
    <div className="py-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-bg-surface" />
      <div className="h-24 rounded-lg bg-bg-surface" />
      <div className="h-20 rounded-lg bg-bg-surface" />
      <div className="h-4 w-32 rounded bg-bg-surface" />
      <div className="h-36 rounded-lg bg-bg-surface" />
      <div className="h-36 rounded-lg bg-bg-surface" />
    </div>
  );
}

/* ---------- Integration card ---------- */

function IntegrationCard({
  name,
  icon,
  brandColor,
  status,
  isLoading,
  onSync,
  isSyncing,
  onConnect,
  onDisconnect,
}: {
  name: string;
  icon: React.ReactNode;
  brandColor: string;
  status?: IntegrationStatus['data'];
  isLoading: boolean;
  onSync: () => void;
  isSyncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (isLoading) {
    return (
      <div className="p-4 bg-bg-surface border border-border rounded-lg animate-pulse">
        <div className="h-5 w-24 rounded bg-bg-elevated mb-3" />
        <div className="h-4 w-32 rounded bg-bg-elevated" />
      </div>
    );
  }

  const connected = status?.connected ?? false;
  const lastSync = status?.lastSync;

  return (
    <div className="p-4 bg-bg-surface border border-border rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="font-body font-semibold text-[15px] text-text-primary">
            {name}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[11px] font-medium uppercase tracking-wider',
            connected
              ? 'bg-success/15 text-success'
              : 'bg-text-muted/15 text-text-muted',
          )}
        >
          {connected ? (
            <>
              <CheckCircle size={12} />
              Ativo
            </>
          ) : (
            <>
              <XCircle size={12} />
              Inativo
            </>
          )}
        </span>
      </div>

      {/* Last sync */}
      {connected && lastSync && (
        <div className="flex items-center gap-1.5 text-text-muted">
          <Clock size={12} />
          <span className="font-body text-[12px]">
            Ultima sync:{' '}
            {format(parseISO(lastSync), "dd/MM/yyyy 'as' HH:mm", {
              locale: ptBR,
            })}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <Button
              variant="secondary"
              onClick={onSync}
              loading={isSyncing}
              className="h-9 text-[12px] px-4"
            >
              <RefreshCw size={14} />
              Sincronizar
            </Button>
            <button
              onClick={onDisconnect}
              className="font-body text-[13px] text-danger hover:text-danger/80 transition-colors ml-auto flex items-center gap-1"
            >
              <Unlink size={14} />
              Desconectar
            </button>
          </>
        ) : (
          <Button
            variant="primary"
            onClick={onConnect}
            className={cn('h-9 text-[12px] px-4', brandColor)}
          >
            <LinkIcon size={14} />
            Conectar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const queryClient = useQueryClient();

  /* Strava status */
  const stravaQuery = useQuery<IntegrationStatus>({
    queryKey: ['integration-strava'],
    queryFn: () =>
      apiFetch<IntegrationStatus>('/api/integrations/strava/status', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  /* intervals.icu status */
  const intervalsQuery = useQuery<IntegrationStatus>({
    queryKey: ['integration-intervals'],
    queryFn: () =>
      apiFetch<IntegrationStatus>('/api/integrations/intervals/status', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  /* Race goal */
  const raceGoalQuery = useQuery<RaceGoal>({
    queryKey: ['race-goal'],
    queryFn: () =>
      apiFetch<RaceGoal>('/api/athlete/race-goal', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  /* Sync mutations */
  const stravaSyncMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/integrations/strava/sync', {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-strava'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const intervalsSyncMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/integrations/intervals/sync', {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-intervals'] });
    },
  });

  /* Disconnect mutations */
  const stravaDisconnectMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/integrations/strava/disconnect', {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-strava'] });
    },
  });

  const intervalsDisconnectMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/integrations/intervals/disconnect', {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-intervals'] });
    },
  });

  /* Connect handlers */
  async function handleConnectStrava() {
    try {
      const res = await apiFetch<{ data: { authUrl: string } }>(
        '/api/integrations/strava/connect',
        { token: token ?? undefined },
      );
      window.location.href = res.data.authUrl;
    } catch {
      // fallback
    }
  }

  async function handleConnectIntervals() {
    try {
      const res = await apiFetch<{ data: { authUrl: string } }>(
        '/api/integrations/intervals/connect',
        { token: token ?? undefined },
      );
      window.location.href = res.data.authUrl;
    } catch {
      // fallback
    }
  }

  /* Logout */
  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const raceGoal = raceGoalQuery.data?.data;
  const daysUntilRace = raceGoal
    ? differenceInDays(parseISO(raceGoal.raceDate), new Date())
    : null;

  const isLoadingPage =
    stravaQuery.isLoading && intervalsQuery.isLoading && raceGoalQuery.isLoading;

  if (isLoadingPage) return <SettingsSkeleton />;

  return (
    <div className="py-6 space-y-6">
      {/* Title */}
      <h1 className="font-heading font-bold text-[28px] text-text-primary">
        Configuracoes
      </h1>

      {/* User info card */}
      <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 text-primary shrink-0">
          <User size={24} />
        </div>
        <div className="min-w-0">
          <p className="font-body font-semibold text-[16px] text-text-primary truncate">
            {user?.name ?? 'Atleta'}
          </p>
          <p className="font-body text-[13px] text-text-secondary truncate">
            {user?.email ?? '---'}
          </p>
        </div>
      </div>

      {/* Race goal card */}
      {raceGoal && (
        <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/15 text-warning shrink-0">
            <Trophy size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-body font-semibold text-[16px] text-text-primary truncate">
              {raceGoal.raceName}
            </p>
            <p className="font-body text-[13px] text-text-secondary">
              {format(parseISO(raceGoal.raceDate), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>
          </div>
          <div className="text-center shrink-0">
            <p className="font-mono font-bold text-[28px] text-primary leading-none">
              {daysUntilRace}
            </p>
            <p className="font-body text-[11px] text-text-muted uppercase tracking-wider">
              dias
            </p>
          </div>
        </div>
      )}

      {/* Integrations section */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-[18px] text-text-primary">
          Integracoes
        </h2>

        {/* Sync error alerts */}
        {stravaSyncMutation.isError && (
          <AlertBanner variant="danger">
            Erro ao sincronizar com Strava.
          </AlertBanner>
        )}
        {intervalsSyncMutation.isError && (
          <AlertBanner variant="danger">
            Erro ao sincronizar com intervals.icu.
          </AlertBanner>
        )}

        {/* Strava card */}
        <IntegrationCard
          name="Strava"
          icon={
            <svg className="w-5 h-5 text-strava" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          }
          brandColor="bg-strava"
          status={stravaQuery.data?.data}
          isLoading={stravaQuery.isLoading}
          onSync={() => stravaSyncMutation.mutate()}
          isSyncing={stravaSyncMutation.isPending}
          onConnect={handleConnectStrava}
          onDisconnect={() => stravaDisconnectMutation.mutate()}
        />

        {/* intervals.icu card */}
        <IntegrationCard
          name="intervals.icu"
          icon={
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-primary">i</span>
            </div>
          }
          brandColor=""
          status={intervalsQuery.data?.data}
          isLoading={intervalsQuery.isLoading}
          onSync={() => intervalsSyncMutation.mutate()}
          isSyncing={intervalsSyncMutation.isPending}
          onConnect={handleConnectIntervals}
          onDisconnect={() => intervalsDisconnectMutation.mutate()}
        />
      </div>

      {/* Account section */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-[18px] text-text-primary">
          Conta
        </h2>

        <button
          onClick={() => router.push('/onboarding')}
          className="flex items-center justify-between w-full p-4 bg-bg-surface border border-border rounded-lg hover:bg-bg-elevated transition-colors"
        >
          <span className="font-body text-[15px] text-text-primary">
            Editar perfil atletico
          </span>
          <ChevronRight size={18} className="text-text-muted" />
        </button>

        <button
          onClick={() => {
            /* placeholder for password change flow */
          }}
          className="flex items-center justify-between w-full p-4 bg-bg-surface border border-border rounded-lg hover:bg-bg-elevated transition-colors"
        >
          <span className="font-body text-[15px] text-text-primary">
            Alterar senha
          </span>
          <ChevronRight size={18} className="text-text-muted" />
        </button>
      </div>

      {/* Logout */}
      <div className="pt-4">
        <Button variant="danger" fullWidth onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </Button>
      </div>

      {/* Spacer for bottom nav */}
      <div className="h-4" />
    </div>
  );
}
