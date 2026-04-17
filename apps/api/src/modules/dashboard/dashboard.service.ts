import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';

// ── Tipos ─────────────────────────────────────────────────────────

interface RaceGoalSummary {
  name: string | null;
  date: string;
  daysRemaining: number;
}

interface CurrentPlanSummary {
  phase: string | null;
  weekNumber: number;
  percentComplete: number;
}

interface WeekSummary {
  workoutsPlanned: number;
  workoutsCompleted: number;
  totalCalories: number;
  volumeHours: number;
}

interface TodayWorkout {
  id: string;
  discipline: string;
  title: string | null;
  durationMin: number | null;
  tssEstimate: number | null;
  description: string | null;
  scheduledDate: string;
}

interface TodayActivity {
  id: string;
  discipline: string;
  title: string | null;
  durationMin: number;
  distanceM: number | null;
  avgHr: number | null;
  calories: number | null;
  startedAt: string;
}

interface TodayProtocol {
  id: string;
  status: string | null;
  items: unknown;
  totalCarbsG: string | null;
  totalSodiumMg: string | null;
  totalCaffeineMg: string | null;
  totalKcal: number | null;
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

interface DashboardSummary {
  raceGoal: RaceGoalSummary | null;
  currentPlan: CurrentPlanSummary | null;
  currentWeek: WeekSummary;
  todayWorkout: TodayWorkout | null;
  todayActivity: TodayActivity | null;
  todayProtocol: TodayProtocol | null;
  alerts: Alert[];
}

// ── Helpers ───────────────────────────────────────────────────────

function getWeekBounds(): { weekStartStr: string; weekEndStr: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStartStr: weekStart.toISOString().split('T')[0]!,
    weekEndStr: weekEnd.toISOString().split('T')[0]!,
  };
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(getTodayStr() + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function calculateWeekNumber(startDateStr: string): number {
  const start = new Date(startDateStr + 'T00:00:00');
  const today = new Date(getTodayStr() + 'T00:00:00');
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// ── getDashboardSummary ───────────────────────────────────────────
// Monta o resumo do dashboard para o usuario

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const alerts: Alert[] = [];
  const today = getTodayStr();
  const { weekStartStr, weekEndStr } = getWeekBounds();

  // 1. Prova alvo ativa
  const raceGoal = await db.query.raceGoals.findFirst({
    where: and(
      eq(schema.raceGoals.userId, userId),
      eq(schema.raceGoals.active, true),
    ),
  });

  let raceGoalSummary: RaceGoalSummary | null = null;
  if (raceGoal) {
    const daysRemaining = daysBetween(raceGoal.raceDate);
    raceGoalSummary = {
      name: raceGoal.raceName,
      date: raceGoal.raceDate,
      daysRemaining,
    };

    // Alerta de taper (prova em menos de 14 dias)
    if (daysRemaining > 0 && daysRemaining < 14) {
      alerts.push({
        type: 'taper',
        severity: 'info',
        message: `Faltam ${daysRemaining} dias para a prova. Considere reduzir volume de treino (taper).`,
      });
    }
  }

  // 2. Plano de treino ativo
  const activePlan = await db.query.trainingPlans.findFirst({
    where: and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ),
    orderBy: [desc(schema.trainingPlans.generatedAt)],
  });

  let currentPlanSummary: CurrentPlanSummary | null = null;
  if (activePlan) {
    const weekNumber = calculateWeekNumber(activePlan.startDate);
    const totalWeeks = activePlan.totalWeeks ?? 1;
    const percentComplete = Math.min(
      100,
      Math.round((weekNumber / totalWeeks) * 100),
    );

    currentPlanSummary = {
      phase: activePlan.currentPhase,
      weekNumber,
      percentComplete,
    };
  }

  // 3. Treinos planejados da semana (com protocolo nutricional)
  const weekWorkouts = await db.query.plannedWorkouts.findMany({
    where: and(
      eq(schema.plannedWorkouts.userId, userId),
      gte(schema.plannedWorkouts.scheduledDate, weekStartStr),
      lte(schema.plannedWorkouts.scheduledDate, weekEndStr),
    ),
    with: {
      nutritionProtocol: true,
    },
  });

  const workoutsPlanned = weekWorkouts.length;

  // 4. Atividades executadas na semana
  const weekStartDate = new Date(weekStartStr + 'T00:00:00');
  const weekEndDate = new Date(weekEndStr + 'T23:59:59');

  const weekActivities = await db.query.activities.findMany({
    where: and(
      eq(schema.activities.userId, userId),
      gte(schema.activities.startedAt, weekStartDate),
      lte(schema.activities.startedAt, weekEndDate),
    ),
  });

  const workoutsCompleted = weekActivities.length;

  // 5. Calorias e volume das atividades reais
  let totalCalories = 0;
  let totalSeconds = 0;

  for (const activity of weekActivities) {
    totalCalories += Number(activity.calories ?? 0);
    totalSeconds += Number(activity.durationSec ?? 0);
  }

  const volumeHours = Math.round((totalSeconds / 3600) * 10) / 10;

  const currentWeek: WeekSummary = {
    workoutsPlanned,
    workoutsCompleted,
    totalCalories: Math.round(totalCalories),
    volumeHours,
  };

  // 6. Treino de hoje
  const todayWorkoutRow = weekWorkouts.find(
    (w) => w.scheduledDate === today,
  );

  let todayWorkout: TodayWorkout | null = null;
  let todayProtocol: TodayProtocol | null = null;

  if (todayWorkoutRow) {
    todayWorkout = {
      id: todayWorkoutRow.id,
      discipline: todayWorkoutRow.discipline,
      title: todayWorkoutRow.title,
      durationMin: todayWorkoutRow.durationMin,
      tssEstimate: todayWorkoutRow.tssEstimate ? Number(todayWorkoutRow.tssEstimate) : null,
      description: todayWorkoutRow.description,
      scheduledDate: todayWorkoutRow.scheduledDate,
    };

    if (todayWorkoutRow.nutritionProtocol) {
      const np = todayWorkoutRow.nutritionProtocol;
      todayProtocol = {
        id: np.id,
        status: np.status,
        items: np.items,
        totalCarbsG: np.totalCarbsG,
        totalSodiumMg: np.totalSodiumMg,
        totalCaffeineMg: np.totalCaffeineMg,
        totalKcal: np.totalKcal,
      };
    }
  }

  // 6b. Atividade executada hoje (exibida quando nao ha treino planejado hoje)
  let todayActivity: TodayActivity | null = null;
  const todayStart = new Date(today + 'T00:00:00');
  const todayEnd = new Date(today + 'T23:59:59');
  const todayActRow = weekActivities
    .filter((a) => a.startedAt >= todayStart && a.startedAt <= todayEnd)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  if (todayActRow) {
    todayActivity = {
      id: todayActRow.id,
      discipline: todayActRow.discipline,
      title: todayActRow.title,
      durationMin: Math.round((todayActRow.durationSec ?? 0) / 60),
      distanceM: todayActRow.distanceM != null ? Number(todayActRow.distanceM) : null,
      avgHr: todayActRow.avgHr,
      calories: todayActRow.calories,
      startedAt: todayActRow.startedAt.toISOString(),
    };
  }

  // 7. Alertas

  // Strava nao conectado?
  const stravaIntegration = await db.query.integrations.findFirst({
    where: and(
      eq(schema.integrations.userId, userId),
      eq(schema.integrations.provider, 'strava'),
      eq(schema.integrations.active, true),
    ),
  });

  if (!stravaIntegration) {
    alerts.push({
      type: 'strava_disconnected',
      severity: 'warning',
      message: 'Strava nao conectado. Conecte para sincronizar atividades automaticamente.',
    });
  }

  // Treinos perdidos nesta semana?
  // Compara treinos planejados ate hoje com atividades completadas
  const pastWorkoutsThisWeek = weekWorkouts.filter(
    (w) => w.scheduledDate <= today,
  );
  const missedCount = pastWorkoutsThisWeek.length - workoutsCompleted;

  if (missedCount > 0) {
    alerts.push({
      type: 'missed_workouts',
      severity: 'warning',
      message: `Voce tem ${missedCount} treino(s) pendente(s) nesta semana.`,
    });
  }

  // Perfil nao preenchido?
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (!profile) {
    alerts.push({
      type: 'onboarding',
      severity: 'critical',
      message: 'Complete seu perfil atletico para receber treinos personalizados.',
    });
  }

  return {
    raceGoal: raceGoalSummary,
    currentPlan: currentPlanSummary,
    currentWeek,
    todayWorkout,
    todayActivity,
    todayProtocol,
    alerts,
  };
}
