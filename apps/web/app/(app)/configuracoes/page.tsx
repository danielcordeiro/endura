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
  UserCog,
  Lock,
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
    <div className="py-6 space-y-5 animate-pulse">
      <div className="h-7 w-44 rounded-md bg-bg-surface" />
      <div className="h-[88px] rounded-xl bg-bg-surface" />
      <div className="h-4 w-28 rounded bg-bg-surface mt-2" />
      <div className="h-[104px] rounded-xl bg-bg-surface" />
      <div className="h-[104px] rounded-xl bg-bg-surface" />
    </div>
  );
}

/* ---------- Section header ---------- */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading font-semibold text-[13px] text-text-muted uppercase tracking-[0.1em] px-1">
      {children}
    </h2>
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
      <div className="card p-4 animate-pulse">
        <div className="h-5 w-24 rounded bg-bg-elevated mb-3" />
        <div className="h-4 w-32 rounded bg-bg-elevated" />
      </div>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', brandColor || 'bg-primary/15')}>
            {icon}
          </div>
          <span className="font-body font-semibold text-[15px] text-text-primary">
            {name}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[11px] font-medium tracking-wide',
            connected
              ? 'bg-success/12 text-success'
              : 'bg-text-muted/10 text-text-muted',
          )}
        >
          {connected ? (
            <>
              <CheckCircle size={11} />
              Ativo
            </>
          ) : (
            <>
              <XCircle size={11} />
              Inativo
            </>
          )}
        </span>
      </div>

      {/* Last sync */}
      {connected && status?.lastSync && (
        <div className="flex items-center gap-1.5 text-text-muted">
          <Clock size={12} />
          <span className="font-body text-[12px]">
            Sync:{' '}
            {format(parseISO(status.lastSync), "dd/MM 'as' HH:mm", {
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
              className="h-9 text-[11px] px-3 rounded-lg"
            >
              <RefreshCw size={13} />
              Sincronizar
            </Button>
            <button
              onClick={onDisconnect}
              className="font-body text-[12px] text-danger/70 hover:text-danger transition-colors ml-auto flex items-center gap-1"
            >
              <Unlink size={13} />
              Desconectar
            </button>
          </>
        ) : (
          <Button
            variant="primary"
            onClick={onConnect}
            className="h-9 text-[11px] px-4 rounded-lg"
          >
            <LinkIcon size={13} />
            Conectar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Menu item ---------- */

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof UserCog;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-4 bg-bg-surface border border-border rounded-xl hover:bg-bg-elevated transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors">
        <Icon size={18} />
      </div>
      <span className="font-body text-[15px] text-text-primary flex-1 text-left">
        {label}
      </span>
      <ChevronRight size={16} className="text-text-muted group-hover:text-text-secondary transition-colors" />
    </button>
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
      <h1 className="font-heading font-bold text-[28px] text-text-primary tracking-tight">
        Configuracoes
      </h1>

      {/* User info card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary shrink-0">
          <User size={26} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="font-heading font-bold text-[18px] text-text-primary truncate leading-tight">
            {user?.name ?? 'Atleta'}
          </p>
          <p className="font-body text-[13px] text-text-muted truncate mt-0.5">
            {user?.email ?? '---'}
          </p>
        </div>
      </div>

      {/* Race goal card */}
      {raceGoal && (
        <div className="card card-glow p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10 text-warning shrink-0">
            <Trophy size={26} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-[16px] text-text-primary truncate leading-tight">
              {raceGoal.raceName}
            </p>
            <p className="font-body text-[12px] text-text-muted mt-0.5">
              {format(parseISO(raceGoal.raceDate), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>
          </div>
          <div className="text-center shrink-0 pl-2">
            <p className="font-mono font-bold text-[32px] text-primary leading-none">
              {daysUntilRace}
            </p>
            <p className="font-body text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
              dias
            </p>
          </div>
        </div>
      )}

      {/* Integrations section */}
      <div className="space-y-3">
        <SectionHeader>Integracoes</SectionHeader>

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
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
            <span className="font-mono text-[11px] font-bold text-primary">i.cu</span>
          }
          brandColor="bg-primary/15"
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
        <SectionHeader>Conta</SectionHeader>

        <MenuItem
          icon={UserCog}
          label="Editar perfil atletico"
          onClick={() => router.push('/onboarding')}
        />
        <MenuItem
          icon={Lock}
          label="Alterar senha"
          onClick={() => {}}
        />
      </div>

      {/* Logout */}
      <div className="pt-2">
        <Button variant="danger" fullWidth onClick={handleLogout}>
          <LogOut size={16} />
          Sair
        </Button>
      </div>
    </div>
  );
}
