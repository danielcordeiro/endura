'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { SectionLabel } from '@/components/ui/section-label';
import { AlertBanner } from '@/components/ui/alert-banner';
import { DailyNutritionCard } from '@/components/nutrition/daily-nutrition-card';
import { PMCChart, type PMCForecastData } from '@/components/dashboard/pmc-chart';
import { ReadinessCard } from '@/components/dashboard/readiness-card';
import { RacePredictorCard } from '@/components/dashboard/race-predictor-card';
import { TargetRaceCard } from '@/components/dashboard/target-race-card';
import { UpcomingRacesCard } from '@/components/dashboard/upcoming-races-card';
import { CreateRaceForm } from '@/components/dashboard/create-race-form';
import { DisciplineBenchmarks } from '@/components/dashboard/discipline-benchmarks';
import { FitnessTestsCard } from '@/components/dashboard/fitness-tests-card';
import { WellnessCard } from '@/components/dashboard/wellness-card';
import { DailyCockpit } from '@/components/dashboard/daily-cockpit';
import { WeightCard } from '@/components/dashboard/weight-card';
import { FatigueStrainCard } from '@/components/dashboard/fatigue-strain-card';
import { WeeklyLoadChart } from '@/components/dashboard/weekly-load-chart';
import { LogPendingCard } from '@/components/nutrition/log-pending-card';

/* ── Types ── */

interface DashboardSummary {
  raceGoal: { name: string | null; date: string; daysRemaining: number } | null;
  currentPlan: { phase: string; weekNumber: number; percentComplete: number } | null;
  currentWeek: {
    workoutsPlanned: number;
    workoutsCompleted: number;
    totalCalories: number;
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
  todayActivity: {
    id: string;
    discipline: string;
    title: string | null;
    durationMin: number;
    distanceM: number | null;
    avgHr: number | null;
    calories: number | null;
    startedAt: string;
  } | null;
  todayProtocol: {
    id: string;
    status: string | null;
    items: Array<{
      phase: 'pre' | 'during' | 'post';
      minuteOffset: number;
      productName: string;
      brand?: string;
      quantity?: number;
      unit?: string;
      carbsG?: number;
      sodiumMg?: number;
      caffeineMg?: number;
      kcal?: number;
    }>;
    totalCarbsG: string | null;
    totalSodiumMg: string | null;
    totalCaffeineMg: string | null;
    totalKcal: number | null;
  } | null;
  alerts: Array<{ type: string; level: string; message: string }>;
}

interface DailyMetric {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  hrvMs: number | null;
  restingHr: number | null;
  fatigueScore: number | null;
  readinessScore: number | null;
  readinessLevel: string | null;
}

interface ReadinessAssessment {
  level: 'intense' | 'moderate' | 'light' | 'rest';
  score: number;
  factors: {
    tsb: number;
    tsbTrend: 'rising' | 'falling' | 'stable';
    ctl: number;
    recentLoadTrend: 'increasing' | 'decreasing' | 'stable';
    sleepQuality: number | null;
    hrvStatus: 'above' | 'below' | 'normal' | 'unknown';
  };
  recommendation: string;
  mentorMessage: string;
  loadTarget?: { tssLow: number; tssHigh: number; label: string };
}

interface RacePrediction {
  totalTimeSec: number;
  swimTimeSec: number;
  bikeTimeSec: number;
  runTimeSec: number;
  t1Sec: number;
  t2Sec: number;
  confidence: number;
  factors: {
    swimPace100m: number;
    bikePowerW: number | null;
    bikeSpeedKmh: number;
    runPaceKm: number;
    fitnessLevel: number;
    bikeElevationGainM?: number | null;
    runElevationGainM?: number | null;
  };
}

interface TargetRace {
  id: string;
  raceName: string | null;
  distance: string;
  raceDate: string;
  targetTime: number | null;
  daysRemaining: number;
  readinessScore: number | null;
  prediction: RacePrediction | null;
  planPhase: string | null;
  planProgress: number | null;
}

interface DisciplineBenchmarkData {
  discipline: 'swim' | 'bike' | 'run';
  totalActivities: number;
  last30dActivities: number;
  bestPace: number | null;
  avgPace: number | null;
  bestSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  bestPowerW: number | null;
  avgPowerW: number | null;
  bestHr: number | null;
  avgHr: number | null;
  longestDistanceM: number | null;
  longestDurationSec: number | null;
  totalDistanceM: number;
  totalDurationSec: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface PerformanceDashboard {
  pmc: {
    metrics: DailyMetric[];
    currentCTL: number;
    currentATL: number;
    currentTSB: number;
  };
  readiness: ReadinessAssessment;
  targetRace: TargetRace | null;
  racePrediction: RacePrediction | null;
  benchmarks: {
    swim: DisciplineBenchmarkData;
    bike: DisciplineBenchmarkData;
    run: DisciplineBenchmarkData;
  };
  weeklyTSS: number;
  monotony: number;
  strain: number;
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

function getUserInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const disciplineColors: Record<string, { bg: string; text: string }> = {
  swim: { bg: 'bg-swim/20', text: 'text-swim' },
  bike: { bg: 'bg-bike/20', text: 'text-bike' },
  run: { bg: 'bg-run/20', text: 'text-run' },
  brick: { bg: 'bg-brick/20', text: 'text-brick' },
};

const disciplineIcons: Record<string, string> = {
  swim: 'pool',
  bike: 'directions_bike',
  run: 'directions_run',
  brick: 'bolt',
};

type DashboardTab = 'today' | 'performance';

/* ── Skeleton Components ── */

function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 bg-bg-base/70 backdrop-blur-xl pt-4 pb-3 flex items-center gap-4">
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
      <div className="skeleton h-10 w-10 rounded-full" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-6">
      <HeaderSkeleton />
      <div className="rounded-card bg-bg-surface p-6 shadow-card border border-hairline space-y-4">
        <div className="skeleton h-7 w-40 rounded-full" />
        <div className="flex items-end justify-between">
          <div className="skeleton h-14 w-32 rounded" />
          <div className="space-y-1.5 text-right">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-3 w-20 rounded ml-auto" />
          </div>
        </div>
        <div className="skeleton h-3 w-full rounded-full" />
      </div>
      <div className="skeleton h-48 w-full rounded-card" />
      <div className="skeleton h-40 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-card bg-bg-surface border border-hairline p-5 space-y-3">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-8 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Workout Structure Bar Chart ── */

function WorkoutStructureChart({
  structure,
  discipline,
}: {
  structure: { warmup: string; main: string; cooldown: string };
  discipline: string;
}) {
  const segments = [
    { key: 'warmup', intensity: 0.3, blocks: 2 },
    { key: 'main', intensity: 1, blocks: 5 },
    { key: 'cooldown', intensity: 0.2, blocks: 2 },
  ];

  const colors = disciplineColors[discipline] ?? disciplineColors.run;

  return (
    <div className="flex items-end gap-1 h-12 mt-2">
      {segments.map((seg) =>
        Array.from({ length: seg.blocks }).map((_, i) => (
          <div
            key={`${seg.key}-${i}`}
            className={cn('flex-1 rounded-sm transition-all', colors!.bg)}
            style={{
              height: `${Math.max(20, seg.intensity * 100)}%`,
              opacity: seg.key === 'main' ? 0.9 : 0.45,
            }}
          />
        )),
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  if (sentSuccess) {
    return (
      <Button variant="secondary" disabled className="gap-2">
        <span className="material-symbols-outlined text-lg">check</span>
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
        <span className="material-symbols-outlined text-lg">error</span>
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
      <span className="material-symbols-outlined text-lg">watch</span>
      Enviar ao relogio
    </Button>
  );
}

/* ── Page ── */

export default function DashboardPage() {
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>('today');
  const [showRaceForm, setShowRaceForm] = useState(false);

  const { data, isLoading, isError } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiFetch<{ data: DashboardSummary }>('/api/dashboard/summary', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  const { data: perfData, isLoading: perfLoading } = useQuery<PerformanceDashboard>({
    queryKey: ['performance-dashboard'],
    queryFn: async () => {
      const res = await apiFetch<{ data: PerformanceDashboard }>('/api/performance/dashboard', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  const { data: forecastData } = useQuery<PMCForecastData>({
    queryKey: ['pmc-forecast'],
    queryFn: async () => {
      const res = await apiFetch<{ data: PMCForecastData }>('/api/performance/pmc-forecast', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  /* ── Loading ── */
  if (isLoading) return <DashboardSkeleton />;

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

  const { currentWeek, todayWorkout, todayActivity, todayProtocol, alerts } = data;
  const firstName = user?.name?.split(' ')[0] ?? '';
  const week = currentWeek ?? { workoutsPlanned: 0, workoutsCompleted: 0, totalCalories: 0, volumeHours: 0 };
  const consistency =
    week.workoutsPlanned > 0
      ? Math.round((week.workoutsCompleted / week.workoutsPlanned) * 100)
      : 0;
  const hasOnboarding = !!alerts?.find((a) => a.type === 'onboarding');

  return (
    <div className="space-y-8 pb-6">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-bg-base/70 backdrop-blur-xl pt-4 pb-3 animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-heading font-bold text-sm shrink-0 ring-2 ring-primary/20 shadow-lg shadow-primary/20">
            {getUserInitials(user?.name ?? null)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted leading-none mb-1">
              {getGreeting()}
            </p>
            <h1 className="font-heading text-xl font-bold text-text-primary leading-tight truncate">
              {firstName || 'Atleta'}
            </h1>
          </div>
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-bg-surface border border-hairline text-text-secondary hover:text-text-primary hover:border-border-strong/50 transition-colors active:scale-[0.98] shrink-0"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">settings</span>
          </Link>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
        <div className="segmented h-12" role="tablist" aria-label="Visão do dashboard">
          <button
            onClick={() => setActiveTab('today')}
            role="tab"
            aria-selected={activeTab === 'today'}
            data-active={activeTab === 'today'}
            className="segmented-item"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">today</span>
            Hoje
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            role="tab"
            aria-selected={activeTab === 'performance'}
            data-active={activeTab === 'performance'}
            className="segmented-item"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">monitoring</span>
            Performance
          </button>
        </div>
      </div>

      {/* ── Onboarding CTA ── */}
      {hasOnboarding && (
        <Link
          href="/onboarding"
          className="block rounded-2xl bg-primary/10 border border-primary/30 p-5 animate-fade-in-up stagger-2 hover:bg-primary/15 transition-colors active:scale-[0.98]"
          style={{ opacity: 0 }}
        >
          <h2 className="font-heading text-lg font-bold text-primary">
            Complete seu perfil
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Configure seu perfil atletico e prova alvo para receber treinos personalizados.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-3">
            Configurar agora
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </span>
        </Link>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB: HOJE ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'today' && (
        <>
          {/* ── Daily Cockpit (hero bento: recovery + forma + alvo + prova) ── */}
          {perfData && (
            <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
              <DailyCockpit
                userName={user?.name ?? null}
                pmc={perfData.pmc}
                readiness={perfData.readiness}
                forecast={forecastData}
                targetRace={perfData.targetRace}
              />
            </div>
          )}

          {/* ── Wellness Data (Garmin) ── */}
          <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
            <WellnessCard />
          </div>

          {/* ── AI Readiness Mentor ── */}
          {perfData && (
            <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
              <ReadinessCard readiness={perfData.readiness} />
            </div>
          )}

          {/* ── Target Race Card / Cadastrar Prova ── */}
          <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            {perfData?.targetRace ? (
              <>
                <TargetRaceCard race={perfData.targetRace} />
                {/* Race Predictor inline */}
                {perfData.racePrediction && (
                  <div className="mt-4">
                    <RacePredictorCard
                      prediction={perfData.racePrediction}
                      targetTimeSec={perfData.targetRace.targetTime}
                    />
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setShowRaceForm(true)}
                className="w-full rounded-card bg-bg-surface p-6 border border-hairline shadow-card flex flex-col items-center text-center hover:ring-primary/30 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
                  <span className="material-symbols-outlined text-3xl text-primary">flag</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-text-primary">Cadastrar Prova Alvo</h3>
                <p className="text-sm text-text-secondary mt-1 max-w-[280px]">
                  Defina sua proxima prova para acompanhar prontidao, previsao de tempo e periodizacao.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-4">
                  Cadastrar agora
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </span>
              </button>
            )}
          </div>

          {/* ── Próximas provas (calendário B/C) ── */}
          <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            <UpcomingRacesCard />
          </div>

          {/* ── Race Form Modal ── */}
          {showRaceForm && <CreateRaceForm onClose={() => setShowRaceForm(false)} />}

          {/* ── Today's Workout ── */}
          <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            <SectionLabel
              action={
                <span className="text-[11px] font-[var(--font-mono)] text-text-secondary bg-bg-elevated/60 px-2 py-1 rounded-md border border-border-strong/50">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
                </span>
              }
            >
              TREINO DE HOJE
            </SectionLabel>

            {todayWorkout ? (
              <div className="rounded-card bg-bg-surface p-5 border border-hairline shadow-card">
                <div className="bg-gradient-to-br from-card-gradient-hi to-card-gradient-lo rounded-card-inner p-5">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex items-center justify-center h-11 w-11 rounded-full shrink-0',
                      disciplineColors[todayWorkout.discipline]?.bg ?? 'bg-bg-elevated',
                    )}>
                      <span className={cn(
                        'material-symbols-outlined text-2xl',
                        disciplineColors[todayWorkout.discipline]?.text ?? 'text-text-secondary',
                      )}>
                        {disciplineIcons[todayWorkout.discipline] ?? 'fitness_center'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="font-heading text-lg font-bold text-text-primary leading-tight">
                            {todayWorkout.title}
                          </h2>
                          {todayWorkout.structure && (
                            <p className="text-xs text-text-muted mt-0.5">Z2-Z3</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-text-primary">
                            {formatDuration(todayWorkout.durationMin)}
                          </p>
                          {todayWorkout.distanceM != null && (
                            <p className="text-xs text-text-muted">
                              {formatDistance(todayWorkout.distanceM)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {todayWorkout.structure && (
                    <WorkoutStructureChart
                      structure={todayWorkout.structure}
                      discipline={todayWorkout.discipline}
                    />
                  )}

                  {todayWorkout.structure && (
                    <p className="text-xs text-text-muted mt-3 line-clamp-2 leading-relaxed">
                      {todayWorkout.structure.main}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Link href={`/treino/${todayWorkout.id}`} className="flex-1">
                    <button className="w-full h-14 rounded-full bg-white text-slate-900 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                      <span className="material-symbols-outlined text-lg">play_arrow</span>
                      Iniciar Treino
                    </button>
                  </Link>
                  <SendToWatchButton
                    workoutId={todayWorkout.id}
                    alreadySent={todayWorkout.sentToWatch}
                  />
                </div>
              </div>
            ) : todayActivity ? (
              <Link href="/atividades">
                <div className="rounded-card bg-bg-surface p-5 border border-hairline shadow-card">
                  <div className="bg-gradient-to-br from-success/10 to-card-gradient-lo rounded-card-inner p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex items-center justify-center h-11 w-11 rounded-full shrink-0',
                        disciplineColors[todayActivity.discipline]?.bg ?? 'bg-bg-elevated',
                      )}>
                        <span className={cn(
                          'material-symbols-outlined text-2xl',
                          disciplineColors[todayActivity.discipline]?.text ?? 'text-text-secondary',
                        )}>
                          {disciplineIcons[todayActivity.discipline] ?? 'fitness_center'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-base text-success">check_circle</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-success">Concluido</span>
                        </div>
                        <h2 className="font-heading text-lg font-bold text-text-primary leading-tight truncate">
                          {todayActivity.title ?? `Treino ${todayActivity.discipline}`}
                        </h2>
                        <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                          <span>{formatDuration(todayActivity.durationMin)}</span>
                          {todayActivity.distanceM != null && (
                            <span>{formatDistance(todayActivity.distanceM)}</span>
                          )}
                          {todayActivity.avgHr != null && (
                            <span>{todayActivity.avgHr} bpm</span>
                          )}
                          {todayActivity.calories != null && (
                            <span>{todayActivity.calories} kcal</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-card bg-bg-surface p-8 border border-hairline shadow-card flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                  <span className="material-symbols-outlined text-3xl text-text-muted">bedtime</span>
                </div>
                <h2 className="font-heading text-xl font-bold text-text-primary">Dia de descanso</h2>
                <p className="text-sm text-text-secondary mt-2 max-w-[260px]">
                  Aproveite para recuperar. Amanha voce volta mais forte.
                </p>
              </div>
            )}
          </div>

          {/* ── Log pendente de nutricao (post-treino) ── */}
          <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            <LogPendingCard />
          </div>

          {/* ── Daily Nutrition Card ── */}
          {todayWorkout && (
            <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
              <DailyNutritionCard
                workoutId={todayWorkout.id}
                protocol={todayProtocol}
                discipline={todayWorkout.discipline}
              />
            </div>
          )}

          {/* ── Stats Grid (2x2) ── */}
          <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
            <SectionLabel
              action={
                <Link href="/atividades" className="text-primary text-sm font-medium hover:text-primary-bright transition-colors">
                  Ver detalhes
                </Link>
              }
            >
              SEMANA ATUAL
            </SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Calorias" value={week.totalCalories} unit="kcal" icon="local_fire_department" />
              <StatCard label="Treinos" value={`${week.workoutsCompleted}/${week.workoutsPlanned}`} context="concluidos" icon="fitness_center" />
              <StatCard label="Volume" value={week.volumeHours.toFixed(1)} unit="horas" icon="schedule" />
              <StatCard label="Consistencia" value={`${consistency}`} unit="%" icon="check_circle" />
            </div>
          </div>

          {/* ── Alerts ── */}
          {alerts.filter((a) => a.type !== 'onboarding').length > 0 && (
            <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
              <SectionLabel>Alertas</SectionLabel>
              <div className="space-y-3">
                {alerts.filter((a) => a.type !== 'onboarding').map((alert, i) => (
                  <AlertBanner key={`${alert.type}-${i}`} variant={alertLevelToVariant(alert.level)}>
                    {alert.message}
                  </AlertBanner>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB: PERFORMANCE ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'performance' && (
        <>
          {perfLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-80 w-full rounded-card" />
              <div className="skeleton h-48 w-full rounded-card" />
              <div className="skeleton h-48 w-full rounded-card" />
            </div>
          ) : perfData ? (
            <>
              {/* ── PMC Chart ── */}
              <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
                <PMCChart
                  metrics={perfData.pmc.metrics}
                  currentCTL={perfData.pmc.currentCTL}
                  currentATL={perfData.pmc.currentATL}
                  currentTSB={perfData.pmc.currentTSB}
                  forecast={forecastData}
                />
              </div>

              {/* ── Weekly Load ── */}
              <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
                <WeeklyLoadChart metrics={perfData.pmc.metrics} />
              </div>

              {/* ── Fatigue & Strain ── */}
              <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
                <FatigueStrainCard
                  weeklyTSS={perfData.weeklyTSS}
                  monotony={perfData.monotony}
                  strain={perfData.strain}
                  currentATL={perfData.pmc.currentATL}
                  currentCTL={perfData.pmc.currentCTL}
                />
              </div>

              {/* ── Discipline Benchmarks ── */}
              <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
                <DisciplineBenchmarks
                  swim={perfData.benchmarks.swim}
                  bike={perfData.benchmarks.bike}
                  run={perfData.benchmarks.run}
                />
              </div>

              {/* ── Fitness Tests (manual) ── */}
              <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
                <FitnessTestsCard />
              </div>

              {/* ── Weight Trend ── */}
              <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
                <WeightCard />
              </div>

              {/* ── Race Predictor ── */}
              {perfData.racePrediction && (
                <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
                  <RacePredictorCard
                    prediction={perfData.racePrediction}
                    targetTimeSec={perfData.targetRace?.targetTime}
                  />
                </div>
              )}

              {/* ── Stats grid ── */}
              <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
                <SectionLabel>METRICAS</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="CTL"
                    value={perfData.pmc.currentCTL.toFixed(0)}
                    context="Fitness (42d)"
                    icon="fitness_center"
                  />
                  <StatCard
                    label="ATL"
                    value={perfData.pmc.currentATL.toFixed(0)}
                    context="Fadiga (7d)"
                    icon="monitor_heart"
                  />
                  <StatCard
                    label="TSB"
                    value={`${perfData.pmc.currentTSB >= 0 ? '+' : ''}${perfData.pmc.currentTSB.toFixed(0)}`}
                    context="Forma (CTL-ATL)"
                    icon="trending_up"
                  />
                  <StatCard
                    label="TSS/Sem"
                    value={perfData.weeklyTSS}
                    context="Carga semanal"
                    icon="bar_chart"
                  />
                </div>
              </div>

            </>
          ) : (
            <div className="rounded-card bg-bg-surface p-8 border border-hairline shadow-card flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                <span className="material-symbols-outlined text-3xl text-text-muted">monitoring</span>
              </div>
              <h2 className="font-heading text-xl font-bold text-text-primary">Sem dados de performance</h2>
              <p className="text-sm text-text-secondary mt-2 max-w-[280px]">
                Conecte o Strava e sincronize suas atividades para ver seus dados de performance.
              </p>
              <Link href="/configuracoes" className="mt-4">
                <Button variant="primary" className="gap-2">
                  <span className="material-symbols-outlined text-lg">link</span>
                  Conectar Strava
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
