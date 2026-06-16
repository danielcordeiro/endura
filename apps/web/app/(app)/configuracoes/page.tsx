'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ApiKeysSection } from '@/components/settings/api-keys-section';

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
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 rounded-lg bg-slate-800/60" />
        <div className="h-10 w-10 rounded-full bg-slate-800/60" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-slate-800/60" />
        <div className="h-5 w-32 rounded bg-slate-800/60" />
        <div className="h-4 w-44 rounded bg-slate-800/60" />
      </div>
      <div className="h-[140px] rounded-2xl bg-slate-800/60" />
      <div className="h-[88px] rounded-2xl bg-slate-800/60" />
      <div className="h-[88px] rounded-2xl bg-slate-800/60" />
    </div>
  );
}

/* ---------- Integration card ---------- */

function IntegrationCard({
  name,
  icon,
  brandBg,
  status,
  isLoading,
  onSync,
  isSyncing,
  onConnect,
  onDisconnect,
}: {
  name: string;
  icon: React.ReactNode;
  brandBg: string;
  status?: IntegrationStatus['data'];
  isLoading: boolean;
  onSync: () => void;
  isSyncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800/50 bg-[#1c262f] p-4 animate-pulse">
        <div className="h-5 w-24 rounded bg-slate-800/60 mb-3" />
        <div className="h-4 w-32 rounded bg-slate-800/60" />
      </div>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="rounded-2xl border border-slate-800/50 bg-bg-surface p-4">
      <div className="flex items-center gap-3">
        {/* Brand icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            brandBg,
          )}
        >
          {icon}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-[15px] text-slate-100 block">{name}</span>
          {connected && status?.lastSync && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-slate-500">
                Sincronizado{' '}
                {format(parseISO(status.lastSync), "dd/MM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
          )}
          {!connected && (
            <span className="text-[11px] text-slate-500 block mt-0.5">Não conectado</span>
          )}
        </div>

        {/* Action button */}
        {connected ? (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated border border-slate-700/50 text-slate-400 hover:text-slate-100 transition-colors disabled:opacity-40 shrink-0"
          >
            <span className={cn('material-symbols-outlined text-xl', isSyncing && 'animate-spin')}>
              sync
            </span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary-hover transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-sm">link</span>
            Conectar
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Menu item ---------- */

function MenuItem({
  icon,
  label,
  onClick,
  soon,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3.5 transition-colors group',
        soon ? 'cursor-not-allowed' : 'hover:bg-[#283139]',
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-[#283139] flex items-center justify-center text-slate-400 group-hover:text-slate-100 transition-colors shrink-0">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
      <span className={cn('text-[15px] flex-1 text-left', soon ? 'text-slate-500' : 'text-slate-100')}>
        {label}
      </span>
      {soon ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-[#283139] px-2 py-1 rounded-md shrink-0">
          Em breve
        </span>
      ) : (
        <span className="material-symbols-outlined text-lg text-slate-500 group-hover:text-slate-400 transition-colors shrink-0">
          chevron_right
        </span>
      )}
    </button>
  );
}

/* ---------- Page ---------- */

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user, token, logout, setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  // Pick up OAuth tokens from URL fragment after Strava/intervals callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || !hash.includes('token=')) return;

    const params = new URLSearchParams(hash.substring(1));
    const callbackToken = params.get('token');

    if (callbackToken) {
      // Decode JWT payload to get user info
      try {
        const payload = JSON.parse(atob(callbackToken.split('.')[1]!));
        const userData = { id: payload.sub, email: payload.email, name: payload.name ?? null, role: payload.role ?? 'athlete' };
        setAuth(userData, callbackToken);
      } catch {
        // If JWT decode fails, just set token directly
        setAuth({ id: '', email: '', name: null, role: 'athlete' }, callbackToken);
      }
      // Clear fragment from URL
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // Refresh integration status
      queryClient.invalidateQueries({ queryKey: ['integration-strava'] });
      queryClient.invalidateQueries({ queryKey: ['integration-intervals'] });
    }
  }, [setAuth, queryClient]);

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
      apiFetch('/api/integrations/intervals/sync-wellness', {
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

  // intervals.icu API Key connect
  const [showIntervalsForm, setShowIntervalsForm] = useState(false);
  const [intervalsApiKey, setIntervalsApiKey] = useState('');
  const [intervalsAthleteId, setIntervalsAthleteId] = useState('');
  const [intervalsConnectError, setIntervalsConnectError] = useState('');

  const intervalsConnectMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: { message: string; synced?: number } }>('/api/integrations/intervals/connect-apikey', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ apiKey: intervalsApiKey, athleteId: intervalsAthleteId }),
      }),
    onSuccess: () => {
      setShowIntervalsForm(false);
      setIntervalsApiKey('');
      setIntervalsAthleteId('');
      setIntervalsConnectError('');
      queryClient.invalidateQueries({ queryKey: ['integration-intervals'] });
      queryClient.invalidateQueries({ queryKey: ['performance-dashboard'] });
    },
    onError: (err: { message?: string }) => {
      setIntervalsConnectError(err.message ?? 'Erro ao conectar. Verifique API Key e Athlete ID.');
    },
  });

  function handleConnectIntervals() {
    setShowIntervalsForm(true);
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
      {/* ── Header ── */}
      <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <h1 className="font-[var(--font-heading)] text-[28px] font-bold text-slate-100 tracking-tight">
          Perfil
        </h1>
      </div>

      {/* ── Avatar + User Info ── */}
      <div className="flex flex-col items-center animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#1c262f] border-2 border-slate-700/50 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
          </div>
          {/* Edit badge */}
          <button
            onClick={() => router.push('/onboarding')}
            aria-label="Editar perfil"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-sm text-white">edit</span>
          </button>
        </div>
        <h2 className="font-[var(--font-heading)] font-bold text-lg text-slate-100 mt-3">
          {user?.name ?? 'Atleta'}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {user?.email ?? '---'}
        </p>
      </div>

      {/* ── Race Target Card ── */}
      {raceGoal && (
        <div
          className="relative rounded-2xl border border-slate-800/50 overflow-hidden animate-fade-in-up stagger-2"
          style={{ opacity: 0 }}
        >
          {/* Background gradient overlay (simulating bg image + gradient) */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-[#1c262f] to-[#1c262f]" />
          <div className="relative p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Prova Alvo
              </span>
              <p className="font-[var(--font-heading)] font-bold text-lg text-slate-100 truncate leading-tight mt-1">
                {raceGoal.raceName}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {format(parseISO(raceGoal.raceDate), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
            {/* Days badge */}
            <div className="shrink-0 text-center bg-[#101a22]/80 rounded-2xl px-4 py-3 border border-slate-800/50">
              <p className="font-[var(--font-mono)] font-bold text-3xl text-primary leading-none">
                {daysUntilRace}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                dias
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Integrations section ── */}
      <div className="space-y-3 animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Integracoes
        </p>

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
            <span className="font-bold text-sm text-white">ST</span>
          }
          brandBg="bg-[#fc4c02]"
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
            <span className="font-[var(--font-mono)] text-[11px] font-bold text-primary">i.cu</span>
          }
          brandBg="bg-primary/15"
          status={intervalsQuery.data?.data}
          isLoading={intervalsQuery.isLoading}
          onSync={() => intervalsSyncMutation.mutate()}
          isSyncing={intervalsSyncMutation.isPending}
          onConnect={handleConnectIntervals}
          onDisconnect={() => intervalsDisconnectMutation.mutate()}
        />
      </div>

      {/* ── Account section ── */}
      <div className="space-y-1 animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
          Conta
        </p>

        <div className="rounded-2xl border border-slate-800/50 bg-bg-surface overflow-hidden divide-y divide-slate-800/50">
          <MenuItem
            icon="manage_accounts"
            label="Editar perfil atletico"
            onClick={() => router.push('/onboarding')}
          />
          <MenuItem
            icon="lock"
            label="Alterar senha"
            soon
          />
          <MenuItem
            icon="credit_card"
            label="Gerenciar assinatura"
            soon
          />
        </div>
      </div>

      {/* ── API Keys ── */}
      <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
        <ApiKeysSection token={token} />
      </div>

      {/* ── Logout ── */}
      <div className="pt-2 animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
        <button
          onClick={handleLogout}
          className={cn(
            'w-full h-14 rounded-full',
            'inline-flex items-center justify-center gap-2',
            'text-sm font-semibold text-red-500',
            'border border-red-500/30',
            'hover:bg-red-500/10 transition-colors',
            'active:scale-[0.98]',
          )}
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Sair da conta
        </button>
      </div>

      {/* ── Version ── */}
      <p className="text-center text-xs text-slate-600 pb-4">
        Endura v1.0.0
      </p>

      {/* ── intervals.icu API Key Modal ── */}
      {showIntervalsForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIntervalsForm(false)} />
          <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6 animate-slide-up">
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15">
                <span className="material-symbols-outlined text-2xl text-blue-400">sync</span>
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-100">Conectar intervals.icu</h2>
                <p className="text-xs text-slate-400">Acesse intervals.icu/settings para gerar sua API Key</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Athlete ID
                </label>
                <input
                  type="text"
                  value={intervalsAthleteId}
                  onChange={(e) => setIntervalsAthleteId(e.target.value)}
                  placeholder="Ex: i12345"
                  className="w-full h-12 bg-bg-input border border-slate-700 rounded-xl px-4 text-sm text-white font-mono placeholder:text-slate-600 focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Visivel na URL do intervals.icu (ex: intervals.icu/athlete/i12345)</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  API Key
                </label>
                <input
                  type="password"
                  value={intervalsApiKey}
                  onChange={(e) => setIntervalsApiKey(e.target.value)}
                  placeholder="Cole sua API Key aqui"
                  className="w-full h-12 bg-bg-input border border-slate-700 rounded-xl px-4 text-sm text-white font-mono placeholder:text-slate-600 focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Gerada em intervals.icu/settings → Chave de API</p>
              </div>

              {intervalsConnectError && (
                <p className="text-sm text-danger">{intervalsConnectError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowIntervalsForm(false)}
                  className="flex-1 h-14 rounded-full bg-bg-elevated text-slate-300 font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => intervalsConnectMutation.mutate()}
                  disabled={!intervalsApiKey || !intervalsAthleteId || intervalsConnectMutation.isPending}
                  className="flex-1 h-14 rounded-full bg-primary text-white font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {intervalsConnectMutation.isPending ? 'Conectando...' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
