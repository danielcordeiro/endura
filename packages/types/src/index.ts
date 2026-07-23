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
  bikeElevationGainM: number | null;
  runElevationGainM: number | null;
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
  /** TSS real (calculado via NP/FTP quando há streams; senão icu_training_load
   * ou estimativa por FC) — denormalizado pro PMC somar sem parsear jsonb. */
  tss: number | null;
  /** true quando há streams (bike/run via Strava) e portanto `analysis` populado. */
  hasStreams: boolean;
  /** Análise avançada (NP/IF/TSS/VI/EF/decoupling/VAM/picos/zonas/laps) — ver
   * ActivityAnalysis. Só presente quando hasStreams=true. */
  analysis: ActivityAnalysis | null;
}

// ── Activity Analysis (NP/IF/TSS/VI/EF/decoupling/VAM/picos/zonas/laps) ──
// Espelha apps/api/src/modules/activity/activity-analytics.ts. Calculado a
// partir de activity_streams (Strava, bike/run) — estilo TrainingPeaks/
// intervals.icu. Sempre no nível da atividade inteira (summary/peaks/zones)
// e por lap (laps[], cada um com o mesmo shape de SegmentMetrics).
//
// Nota: usa seu próprio union de disciplina (não o `Discipline` acima) porque
// o valor real vem de mapSportType() no sync (strava-sync.service.ts), que
// produz 'other' — fora do union 'swim'|'bike'|'run'|'brick' usado pra planos.
export type AnalysisDiscipline = 'bike' | 'run' | 'swim' | 'other';

export interface MinAvgMax {
  min: number | null;
  avg: number | null;
  max: number | null;
}

export interface SegmentMetrics {
  durationSec: number;
  movingSec: number;
  distanceM: number | null;
  elevGainM: number | null;
  elevLossM: number | null;
  avgGradePct: number | null;
  power: MinAvgMax;
  heartRate: MinAvgMax;
  cadence: MinAvgMax;
  speedMs: MinAvgMax;
  altitudeM: MinAvgMax;
  tempC: MinAvgMax;
  npWatts: number | null;
  ifValue: number | null;
  viValue: number | null;
  efValue: number | null;
  pwHrDecouplingPct: number | null;
  vamMhr: number | null;
  tss: number | null;
  tssMethod: 'power' | 'hr' | null;
  workKj: number | null;
  wPerKg: number | null;
}

export interface LapAnalysis extends SegmentMetrics {
  lapIndex: number;
  startOffsetSec: number;
  name: string | null;
}

export interface ZoneResult {
  zone: number;
  label: string;
  lowPct: number;
  highPct: number | null;
  secs: number;
  pct: number;
}

export interface PeakEfforts {
  power: Record<string, number | null>;
  pace: Record<string, number | null>;
}

export interface ActivityAnalysis {
  version: 1;
  computedAt: string;
  discipline: AnalysisDiscipline;
  inputs: { ftpWatts: number | null; maxHr: number | null; weightKg: number | null };
  summary: SegmentMetrics;
  peaks: PeakEfforts;
  zones: { hr: ZoneResult[]; power: ZoneResult[] };
  laps: LapAnalysis[];
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

// ── Performance / PMC ──────────────────────────────────

export type ReadinessLevel = 'intense' | 'moderate' | 'light' | 'rest';

export interface DailyMetric {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  hrvMs: number | null;
  restingHr: number | null;
  fatigueScore: number | null;
  readinessScore: number | null;
  readinessLevel: ReadinessLevel | null;
}

export interface PMCData {
  metrics: DailyMetric[];
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
}

export interface ReadinessAssessment {
  level: ReadinessLevel;
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
}

export interface RacePrediction {
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
    bikeElevationGainM: number | null;
    runElevationGainM: number | null;
  };
}

export interface TargetRace {
  id: string;
  raceName: string | null;
  distance: RaceDistance;
  raceDate: string;
  targetTime: number | null;
  daysRemaining: number;
  readinessScore: number | null;
  prediction: RacePrediction | null;
  planPhase: TrainingPhase | null;
  planProgress: number | null;
}

export type FitnessTestType = 'swim_t30' | 'bike_ftp20' | 'run_cooper12';

export interface FitnessTestResult {
  id: string;
  testType: FitnessTestType;
  testDate: string;
  distanceM: number | null;
  avgPowerW: number | null;
  avgHr: number | null;
  derivedPace: number | null;
  derivedFtp: number | null;
  derivedVo2max: number | null;
}

export interface DisciplineBenchmark {
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

export interface PerformanceDashboard {
  pmc: PMCData;
  readiness: ReadinessAssessment;
  targetRace: TargetRace | null;
  racePrediction: RacePrediction | null;
  benchmarks: {
    swim: DisciplineBenchmark;
    bike: DisciplineBenchmark;
    run: DisciplineBenchmark;
  };
  weeklyTSS: number;
  monotony: number;
  strain: number;
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
