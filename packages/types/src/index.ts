// ── Athlete ─────────────────────────────────────────────

export type AthleteLevel = 'iniciante' | 'intermediario' | 'competitivo';
export type Discipline = 'swim' | 'bike' | 'run' | 'brick';
export type RaceDistance = 'sprint' | 'olympic' | '70.3' | 'full';
export type RaceGoalType = 'finish' | 'time';
export type UserRole = 'athlete' | 'coach';

export interface AthleteProfile {
  id: string;
  userId: string;
  level: AthleteLevel;
  weakestDiscipline: Discipline | null;
  weeklyHours: number | null;
  availableDays: number[];
  hasPool: boolean;
  hasBikeTrainer: boolean;
  hasTreadmill: boolean;
  weightKg: number | null;
  heightCm: number | null;
  maxHr: number | null;
  ftpWatts: number | null;
  run5kPaceSec: number | null;
  dietaryRestrictions: string[];
  ownedProducts: string[];
  giSensitivity: boolean;
  sweatRateHigh: boolean;
  crampsHistory: boolean;
}

export interface RaceGoal {
  id: string;
  userId: string;
  distance: RaceDistance;
  raceDate: string;
  goal: RaceGoalType;
  targetTime: number | null;
  raceName: string | null;
  active: boolean;
}

// ── Training ────────────────────────────────────────────

export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper';
export type PlanStatus = 'active' | 'paused' | 'completed';

export interface WorkoutStructure {
  warmup: string;
  main: string;
  cooldown: string;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  raceGoalId: string | null;
  currentPhase: TrainingPhase | null;
  startDate: string;
  endDate: string;
  totalWeeks: number | null;
  status: PlanStatus;
}

export interface PlannedWorkout {
  id: string;
  planId: string;
  userId: string;
  scheduledDate: string;
  discipline: Discipline;
  title: string | null;
  description: string | null;
  structure: WorkoutStructure | null;
  durationMin: number | null;
  distanceM: number | null;
  intensityZone: string | null;
  tssEstimate: number | null;
  sentToWatch: boolean;
  sentAt: string | null;
  intervalsWorkoutId: string | null;
  week: number | null;
  phase: TrainingPhase | null;
}

// ── Activity ────────────────────────────────────────────

export type ActivitySource = 'strava' | 'intervals_icu' | 'manual';
export type AdverseEvent = 'gi' | 'cramps' | 'dizziness' | 'nausea';

export interface Activity {
  id: string;
  userId: string;
  plannedWorkoutId: string | null;
  externalId: string | null;
  source: ActivitySource;
  discipline: Discipline;
  title: string | null;
  startedAt: string;
  durationSec: number | null;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPowerW: number | null;
  elevationM: number | null;
  calories: number | null;
  tempStartC: number | null;
  tempAvgC: number | null;
  humidityPct: number | null;
  windMps: number | null;
  adverseEvents: AdverseEvent[];
  perceivedEffort: number | null;
  notes: string | null;
}

// ── Nutrition ───────────────────────────────────────────

export type NutritionPhase = 'pre' | 'during' | 'post';
export type NutritionItemSource = 'manual' | 'preset' | 'ocr' | 'nlp';

export interface NutritionProtocolItem {
  phase: NutritionPhase;
  minuteOffset: number;
  product: string;
  carbsG: number | null;
  sodiumMg: number | null;
  caffeineMg: number | null;
  kcal: number | null;
}

export interface NutritionLog {
  id: string;
  activityId: string;
  userId: string;
  totalCarbsG: number | null;
  totalSodiumMg: number | null;
  totalCaffeineMg: number | null;
  totalKcal: number | null;
}

export interface NutritionItem {
  id: string;
  logId: string;
  phase: NutritionPhase;
  minuteOffset: number | null;
  productName: string;
  brand: string | null;
  quantity: number | null;
  unit: string | null;
  carbsG: number | null;
  sodiumMg: number | null;
  caffeineMg: number | null;
  kcal: number | null;
  source: NutritionItemSource;
  confidence: number | null;
}

export interface SupplementPreset {
  id: string;
  userId: string;
  name: string;
  items: NutritionProtocolItem[];
}

// ── Integration ─────────────────────────────────────────

export type IntegrationProvider = 'strava' | 'intervals_icu';
export type SyncStatus = 'idle' | 'syncing' | 'error';
export type SyncOutcome = 'success' | 'failure';

export interface Integration {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  externalUserId: string | null;
  lastSyncAt: string | null;
  syncStatus: SyncStatus;
  active: boolean;
}

// ── AI ──────────────────────────────────────────────────

export type InsightCategory = 'carbs' | 'sodium' | 'caffeine' | 'hydration' | 'performance';
export type AlertLevel = 'ok' | 'warn' | 'alert';

export interface AiInsight {
  id: string;
  activityId: string;
  category: InsightCategory;
  insight: string;
  recommendation: string | null;
  score: number | null;
  alertLevel: AlertLevel | null;
}

// ── Dashboard ───────────────────────────────────────────

export interface DashboardSummary {
  raceGoal: {
    name: string | null;
    date: string;
    daysRemaining: number;
  } | null;
  currentPlan: {
    phase: TrainingPhase | null;
    weekNumber: number;
    percentComplete: number;
  } | null;
  currentWeek: {
    workoutsPlanned: number;
    workoutsCompleted: number;
    tssEstimate: number;
    volumeHours: number;
  };
  todayWorkout: PlannedWorkout | null;
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  type: 'warning' | 'danger' | 'info';
  message: string;
  actionUrl?: string;
}

// ── API Response ────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}
