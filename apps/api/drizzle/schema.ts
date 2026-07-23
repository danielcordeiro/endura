import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── USUÁRIOS ──────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  role: varchar('role', { length: 20 }).notNull().default('athlete'),
  refreshToken: text('refresh_token'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  athleteProfile: one(athleteProfiles, {
    fields: [users.id],
    references: [athleteProfiles.userId],
  }),
  raceGoals: many(raceGoals),
  integrations: many(integrations),
  trainingPlans: many(trainingPlans),
  activities: many(activities),
  supplementPresets: many(supplementPresets),
}));

// ── PERFIL ATLÉTICO (onboarding) ──────────────────────────────

export const athleteProfiles = pgTable('athlete_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  level: varchar('level', { length: 20 }).notNull(),
  weakestDiscipline: varchar('weakest_discipline', { length: 10 }),
  weeklyHours: numeric('weekly_hours', { precision: 4, scale: 1 }),
  availableDays: integer('available_days').array(),
  hasPool: boolean('has_pool').default(false),
  hasBikeTrainer: boolean('has_bike_trainer').default(false),
  hasTreadmill: boolean('has_treadmill').default(false),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  heightCm: integer('height_cm'),
  maxHr: integer('max_hr'),
  ftpWatts: integer('ftp_watts'),
  run5kPaceSec: integer('run_5k_pace_sec'),
  // ── Setup aerodinâmico (estimativa de CdA por pedalada, ver aero.ts) ──
  bikeWeightKg: numeric('bike_weight_kg', { precision: 4, scale: 2 }),
  crr: numeric('crr', { precision: 5, scale: 4 }),                          // resist. de rolamento (preset de pneu/piso)
  drivetrainEfficiency: numeric('drivetrain_efficiency', { precision: 4, scale: 3 }), // η, default 0.975 aplicado no cálculo
  dietaryRestrictions: text('dietary_restrictions').array(),
  ownedProducts: text('owned_products').array(),
  giSensitivity: boolean('gi_sensitivity').default(false),
  sweatRateHigh: boolean('sweat_rate_high').default(false),
  crampsHistory: boolean('cramps_history').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const athleteProfilesRelations = relations(athleteProfiles, ({ one }) => ({
  user: one(users, {
    fields: [athleteProfiles.userId],
    references: [users.id],
  }),
}));

// ── PROVA ALVO ────────────────────────────────────────────────

export const raceGoals = pgTable('race_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  distance: varchar('distance', { length: 20 }).notNull(),
  raceDate: date('race_date').notNull(),
  goal: varchar('goal', { length: 20 }).notNull(),
  targetTime: integer('target_time_sec'),
  raceName: varchar('race_name', { length: 255 }),
  bikeElevationGainM: numeric('bike_elevation_gain_m', { precision: 8, scale: 2 }),
  runElevationGainM: numeric('run_elevation_gain_m', { precision: 8, scale: 2 }),
  // Prioridade no calendário: 'A' (prova alvo principal), 'B' (importante), 'C' (treino/preparação).
  priority: varchar('priority', { length: 1 }).default('A'),
  location: varchar('location', { length: 255 }),
  notes: text('notes'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const raceGoalsRelations = relations(raceGoals, ({ one }) => ({
  user: one(users, {
    fields: [raceGoals.userId],
    references: [users.id],
  }),
}));

// ── INTEGRAÇÕES ───────────────────────────────────────────────

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 30 }).notNull(),
  externalUserId: varchar('external_user_id', { length: 255 }),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 20 }).default('idle'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_integrations_user_provider').on(table.userId, table.provider),
]);

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

// ── PLANOS DE TREINO ──────────────────────────────────────────

export const trainingPlans = pgTable('training_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  raceGoalId: uuid('race_goal_id').references(() => raceGoals.id),
  currentPhase: varchar('current_phase', { length: 20 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalWeeks: integer('total_weeks'),
  status: varchar('status', { length: 20 }).default('active'),
  generatedAt: timestamp('generated_at').defaultNow(),
  lastAdaptedAt: timestamp('last_adapted_at'),
});

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [trainingPlans.userId],
    references: [users.id],
  }),
  raceGoal: one(raceGoals, {
    fields: [trainingPlans.raceGoalId],
    references: [raceGoals.id],
  }),
  plannedWorkouts: many(plannedWorkouts),
  weeklyCheckins: many(weeklyCheckins),
}));

// ── TREINOS PLANEJADOS ────────────────────────────────────────

export const plannedWorkouts = pgTable('planned_workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => trainingPlans.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduledDate: date('scheduled_date').notNull(),
  discipline: varchar('discipline', { length: 10 }).notNull(),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  structure: jsonb('structure'),
  durationMin: integer('duration_min'),
  distanceM: integer('distance_m'),
  intensityZone: varchar('intensity_zone', { length: 10 }),
  tssEstimate: numeric('tss_estimate', { precision: 6, scale: 1 }),
  sentToWatch: boolean('sent_to_watch').default(false),
  sentAt: timestamp('sent_at'),
  intervalsWorkoutId: varchar('intervals_workout_id', { length: 100 }),
  week: integer('week'),
  phase: varchar('phase', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_planned_workouts_plan_date').on(table.planId, table.scheduledDate),
]);

export const plannedWorkoutsRelations = relations(plannedWorkouts, ({ one, many }) => ({
  plan: one(trainingPlans, {
    fields: [plannedWorkouts.planId],
    references: [trainingPlans.id],
  }),
  user: one(users, {
    fields: [plannedWorkouts.userId],
    references: [users.id],
  }),
  nutritionProtocol: one(nutritionProtocols, {
    fields: [plannedWorkouts.id],
    references: [nutritionProtocols.plannedWorkoutId],
  }),
  activities: many(activities),
}));

// ── ATIVIDADES EXECUTADAS ─────────────────────────────────────

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plannedWorkoutId: uuid('planned_workout_id').references(() => plannedWorkouts.id),
  externalId: varchar('external_id', { length: 100 }),
  source: varchar('source', { length: 20 }).notNull(),
  discipline: varchar('discipline', { length: 10 }).notNull(),
  title: varchar('title', { length: 255 }),
  startedAt: timestamp('started_at').notNull(),
  durationSec: integer('duration_sec'), // tempo DECORRIDO (inclui descanso/paradas)
  // Tempo em MOVIMENTO — crítico pra pace/velocidade (natação com descanso
  // entre séries é o caso extremo: elapsed conta o descanso todo, inflando o
  // "pace médio" pra bem mais lento que o ritmo real de nado). durationSec
  // continua sendo "tempo total gasto no treino" (correto pra volume/TSS).
  movingTimeSec: integer('moving_time_sec'),
  distanceM: numeric('distance_m', { precision: 10, scale: 2 }),
  avgHr: integer('avg_hr'),
  maxHr: integer('max_hr'),
  avgPowerW: integer('avg_power_w'),
  elevationM: numeric('elevation_m', { precision: 8, scale: 2 }),
  calories: integer('calories'),
  latStart: numeric('lat_start', { precision: 10, scale: 7 }),
  lonStart: numeric('lon_start', { precision: 10, scale: 7 }),
  tempStartC: numeric('temp_start_c', { precision: 5, scale: 2 }),
  tempAvgC: numeric('temp_avg_c', { precision: 5, scale: 2 }),
  humidityPct: integer('humidity_pct'),
  windMps: numeric('wind_mps', { precision: 5, scale: 2 }),
  adverseEvents: text('adverse_events').array(),
  perceivedEffort: integer('perceived_effort'),
  notes: text('notes'),
  rawData: jsonb('raw_data'),
  // ── Análise avançada (NP/IF/TSS/VI/EF/decoupling/VAM/picos/zonas/laps) ──
  // Calculada a partir de activity_streams quando disponível (bike/run com
  // watts ou pace). tss fica denormalizado aqui pra PMC (CTL/ATL/TSB) somar
  // direto sem parsear jsonb; analysis carrega o resto (ver activity-analytics.ts).
  tss: numeric('tss', { precision: 6, scale: 2 }),
  analysis: jsonb('analysis'),
  hasStreams: boolean('has_streams').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_activities_user_started').on(table.userId, table.startedAt),
  index('idx_activities_external_id').on(table.externalId, table.source),
  // Upsert atômico no sync (strava-sync.service.ts) — sem isso, cron + sync
  // manual concorrentes pra o mesmo usuário podiam inserir a MESMA atividade
  // duas vezes (check-then-insert sem transação). NULLs em external_id (hoje
  // nunca acontece — só sync automático grava activities) não conflitam
  // entre si no Postgres, então não precisa de WHERE parcial.
  uniqueIndex('idx_activities_user_external_source_unique').on(table.userId, table.externalId, table.source),
]);

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  plannedWorkout: one(plannedWorkouts, {
    fields: [activities.plannedWorkoutId],
    references: [plannedWorkouts.id],
  }),
  nutritionLog: one(nutritionLogs, {
    fields: [activities.id],
    references: [nutritionLogs.activityId],
  }),
  aiInsights: many(aiInsights),
  streams: one(activityStreams, {
    fields: [activities.id],
    references: [activityStreams.activityId],
  }),
}));

// ── NUTRIÇÃO PRESCRITA ────────────────────────────────────────

export const nutritionProtocols = pgTable('nutrition_protocols', {
  id: uuid('id').primaryKey().defaultRandom(),
  plannedWorkoutId: uuid('planned_workout_id').notNull()
    .references(() => plannedWorkouts.id, { onDelete: 'cascade' }),
  items: jsonb('items').notNull(),
  totalCarbsG: numeric('total_carbs_g', { precision: 8, scale: 2 }),
  totalSodiumMg: numeric('total_sodium_mg', { precision: 8, scale: 2 }),
  totalCaffeineMg: numeric('total_caffeine_mg', { precision: 6, scale: 2 }),
  totalKcal: integer('total_kcal'),
  status: varchar('status', { length: 20 }).default('generated'),
  acceptedAt: timestamp('accepted_at'),
  weatherContext: jsonb('weather_context'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const nutritionProtocolsRelations = relations(nutritionProtocols, ({ one }) => ({
  plannedWorkout: one(plannedWorkouts, {
    fields: [nutritionProtocols.plannedWorkoutId],
    references: [plannedWorkouts.id],
  }),
}));

// ── NUTRIÇÃO REGISTRADA ───────────────────────────────────────

export const nutritionLogs = pgTable('nutrition_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  nutritionProtocolId: uuid('nutrition_protocol_id').references(() => nutritionProtocols.id),
  followedExactly: boolean('followed_exactly').default(false),
  carbsPerHour: numeric('carbs_per_hour', { precision: 6, scale: 2 }),
  sodiumPerHour: numeric('sodium_per_hour', { precision: 6, scale: 2 }),
  adherenceScore: numeric('adherence_score', { precision: 5, scale: 2 }),
  totalCarbsG: numeric('total_carbs_g', { precision: 8, scale: 2 }),
  totalSodiumMg: numeric('total_sodium_mg', { precision: 8, scale: 2 }),
  totalCaffeineMg: numeric('total_caffeine_mg', { precision: 6, scale: 2 }),
  totalKcal: integer('total_kcal'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const nutritionLogsRelations = relations(nutritionLogs, ({ one, many }) => ({
  activity: one(activities, {
    fields: [nutritionLogs.activityId],
    references: [activities.id],
  }),
  user: one(users, {
    fields: [nutritionLogs.userId],
    references: [users.id],
  }),
  items: many(nutritionItems),
}));

export const nutritionItems = pgTable('nutrition_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  logId: uuid('log_id').notNull().references(() => nutritionLogs.id, { onDelete: 'cascade' }),
  phase: varchar('phase', { length: 10 }).notNull(),
  minuteOffset: integer('minute_offset'),
  productName: varchar('product_name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 100 }),
  quantity: numeric('quantity', { precision: 6, scale: 2 }),
  unit: varchar('unit', { length: 20 }),
  carbsG: numeric('carbs_g', { precision: 6, scale: 2 }),
  sodiumMg: numeric('sodium_mg', { precision: 6, scale: 2 }),
  caffeineMg: numeric('caffeine_mg', { precision: 6, scale: 2 }),
  kcal: integer('kcal'),
  source: varchar('source', { length: 20 }).default('manual'),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_nutrition_items_log').on(table.logId),
]);

export const nutritionItemsRelations = relations(nutritionItems, ({ one }) => ({
  log: one(nutritionLogs, {
    fields: [nutritionItems.logId],
    references: [nutritionLogs.id],
  }),
}));

// ── PRESETS DE SUPLEMENTAÇÃO ──────────────────────────────────

export const supplementPresets = pgTable('supplement_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  items: jsonb('items').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const supplementPresetsRelations = relations(supplementPresets, ({ one }) => ({
  user: one(users, {
    fields: [supplementPresets.userId],
    references: [users.id],
  }),
}));

// ── INSIGHTS DE IA ────────────────────────────────────────────

export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 30 }).notNull(),
  insight: text('insight').notNull(),
  recommendation: text('recommendation'),
  score: numeric('score', { precision: 3, scale: 2 }),
  alertLevel: varchar('alert_level', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_ai_insights_activity').on(table.activityId),
]);

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  activity: one(activities, {
    fields: [aiInsights.activityId],
    references: [activities.id],
  }),
}));

// ── CHECKINS SEMANAIS ─────────────────────────────────────────

export const weeklyCheckins = pgTable('weekly_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => trainingPlans.id),
  weekNumber: integer('week_number').notNull(),
  completedWorkouts: integer('completed_workouts'),
  totalPlanned: integer('total_planned'),
  energyLevel: integer('energy_level'),
  sleepQuality: integer('sleep_quality'),
  muscleSoreness: integer('muscle_soreness'),
  notes: text('notes'),
  planAdapted: boolean('plan_adapted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const weeklyCheckinsRelations = relations(weeklyCheckins, ({ one }) => ({
  user: one(users, {
    fields: [weeklyCheckins.userId],
    references: [users.id],
  }),
  plan: one(trainingPlans, {
    fields: [weeklyCheckins.planId],
    references: [trainingPlans.id],
  }),
}));

// ── LOGS DE SINCRONIZAÇÃO ─────────────────────────────────────

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  provider: varchar('provider', { length: 30 }).notNull(),
  correlationId: uuid('correlation_id').defaultRandom(),
  outcome: varchar('outcome', { length: 10 }).notNull(),
  activitiesSynced: integer('activities_synced').default(0),
  errorDetails: text('error_details'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_sync_logs_created').on(table.createdAt),
]);

// ── CATÁLOGO DE PRODUTOS ─────────────────────────────────────

export const productCatalog = pgTable('product_catalog', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 100 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  servingSize: varchar('serving_size', { length: 50 }),
  carbsG: numeric('carbs_g', { precision: 6, scale: 2 }),
  sodiumMg: numeric('sodium_mg', { precision: 6, scale: 2 }),
  caffeineMg: numeric('caffeine_mg', { precision: 6, scale: 2 }),
  kcal: integer('kcal'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_product_catalog_name_brand').on(table.name, table.brand),
]);

// ── MÉTRICAS DIÁRIAS (PMC / HRV / Readiness) ─────────────────

export const dailyMetrics = pgTable('daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  tss: numeric('tss', { precision: 8, scale: 2 }).default('0'),
  ctl: numeric('ctl', { precision: 8, scale: 2 }).default('0'),
  atl: numeric('atl', { precision: 8, scale: 2 }).default('0'),
  tsb: numeric('tsb', { precision: 8, scale: 2 }).default('0'),
  hrvMs: numeric('hrv_ms', { precision: 6, scale: 2 }),
  hrvBaseline: numeric('hrv_baseline', { precision: 6, scale: 2 }),
  restingHr: integer('resting_hr'),
  sleepDurationH: numeric('sleep_duration_h', { precision: 4, scale: 2 }),
  sleepScore: integer('sleep_score'),
  sleepQuality: integer('sleep_quality'),
  spo2: integer('spo2'),
  stressLevel: integer('stress_level'),
  bodyBattery: integer('body_battery'),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  // Lacunas Garmin via intervals.icu (sync estendido)
  vo2max: numeric('vo2max', { precision: 5, scale: 2 }),
  respirationRate: numeric('respiration_rate', { precision: 5, scale: 2 }), // resp/min
  hrvStatus: varchar('hrv_status', { length: 20 }),                          // low | balanced | high | unknown (derivado de hrvMs vs hrvBaseline)
  intervalsReadiness: numeric('intervals_readiness', { precision: 5, scale: 2 }), // readiness proprio do intervals.icu (distinto do readinessScore do Endura)
  recoveryTimeH: numeric('recovery_time_h', { precision: 5, scale: 1 }),     // horas ate recuperado (Garmin)
  sleepDeepH: numeric('sleep_deep_h', { precision: 4, scale: 2 }),
  sleepLightH: numeric('sleep_light_h', { precision: 4, scale: 2 }),
  sleepRemH: numeric('sleep_rem_h', { precision: 4, scale: 2 }),
  fatigueScore: numeric('fatigue_score', { precision: 5, scale: 2 }),
  readinessScore: numeric('readiness_score', { precision: 5, scale: 2 }),
  readinessLevel: varchar('readiness_level', { length: 20 }),
  mentorRecommendation: text('mentor_recommendation'),
  source: varchar('source', { length: 20 }).default('calculated'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_daily_metrics_user_date').on(table.userId, table.date),
]);

export const dailyMetricsRelations = relations(dailyMetrics, ({ one }) => ({
  user: one(users, {
    fields: [dailyMetrics.userId],
    references: [users.id],
  }),
}));

// ── CHECK-INS DIÁRIOS (Mentor AI) ─────────────────────────────

export const dailyCheckins = pgTable('daily_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  feeling: integer('feeling').notNull(),          // 1-5
  muscleSoreness: integer('muscle_soreness').notNull(), // 1-5
  injuryNote: text('injury_note'),
  readinessScore: integer('readiness_score'),
  readinessLevel: varchar('readiness_level', { length: 20 }),
  mentorMessage: text('mentor_message'),
  recommendation: text('recommendation'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_daily_checkins_user_date').on(table.userId, table.date),
]);

export const dailyCheckinsRelations = relations(dailyCheckins, ({ one }) => ({
  user: one(users, {
    fields: [dailyCheckins.userId],
    references: [users.id],
  }),
}));

// ── TESTES DE FITNESS ─────────────────────────────────────────

export const fitnessTests = pgTable('fitness_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  testType: varchar('test_type', { length: 30 }).notNull(), // swim_t30, bike_ftp20, run_cooper12
  testDate: date('test_date').notNull(),
  distanceM: numeric('distance_m', { precision: 10, scale: 2 }),
  durationSec: integer('duration_sec'),
  avgPowerW: integer('avg_power_w'),
  avgHr: integer('avg_hr'),
  derivedPace: numeric('derived_pace', { precision: 8, scale: 2 }),  // sec per 100m (swim) or sec per km (run)
  derivedFtp: integer('derived_ftp'),                                 // bike FTP
  derivedVo2max: numeric('derived_vo2max', { precision: 6, scale: 2 }), // Cooper VO2max
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_fitness_tests_user_type').on(table.userId, table.testType),
]);

export const fitnessTestsRelations = relations(fitnessTests, ({ one }) => ({
  user: one(users, {
    fields: [fitnessTests.userId],
    references: [users.id],
  }),
}));

// ── MÓDULO TREINADOR (fase 3) ─────────────────────────────────

export const coachAthletes = pgTable('coach_athletes', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coach_id').notNull().references(() => users.id),
  athleteId: uuid('athlete_id').notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).default('pending'),
  inviteCode: varchar('invite_code', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityComments = pgTable('activity_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull().references(() => activities.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── STREAMS (séries temporais) ────────────────────────────────
// Uma linha por atividade. Arrays paralelos indexados por amostra (mesmo
// tamanho de timeSec), na resolução nativa do provedor (Strava: amostragem
// "smart recording" — irregular, valor mantido constante entre pontos).
// Usado pelo motor de análise (activity-analytics.ts) e pelo gráfico da UI.

export const activityStreams = pgTable('activity_streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull().unique().references(() => activities.id, { onDelete: 'cascade' }),
  timeSec: jsonb('time_sec').notNull(),     // number[] — segundos decorridos desde o início
  watts: jsonb('watts'),                    // number[] | null
  heartRate: jsonb('heart_rate'),
  cadence: jsonb('cadence'),
  distanceM: jsonb('distance_m'),           // number[] — cumulativo
  altitudeM: jsonb('altitude_m'),
  velocityMs: jsonb('velocity_ms'),
  gradePct: jsonb('grade_pct'),
  moving: jsonb('moving'),                  // boolean[]
  tempC: jsonb('temp_c'),
  sampleCount: integer('sample_count').notNull(),
  source: varchar('source', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityStreamsRelations = relations(activityStreams, ({ one }) => ({
  activity: one(activities, { fields: [activityStreams.activityId], references: [activities.id] }),
}));

// ── PLANOS NUTRICIONAIS RACE DAY ─────────────────────────────

export const raceNutritionPlans = pgTable('race_nutrition_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  raceGoalId: uuid('race_goal_id').references(() => raceGoals.id),
  name: varchar('name', { length: 255 }).notNull(),
  targetTimeSec: integer('target_time_sec'),
  weatherConditions: jsonb('weather_conditions'),
  plan: jsonb('plan').notNull(),
  totals: jsonb('totals'),
  testedInWorkouts: text('tested_in_workouts').array(),
  status: varchar('status', { length: 20 }).default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const raceNutritionPlansRelations = relations(raceNutritionPlans, ({ one }) => ({
  user: one(users, {
    fields: [raceNutritionPlans.userId],
    references: [users.id],
  }),
  raceGoal: one(raceGoals, {
    fields: [raceNutritionPlans.raceGoalId],
    references: [raceGoals.id],
  }),
}));

// ── API KEYS ──────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 24 }).notNull(),
  scopes: text('scopes').array().default(['read:all']),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
}, (table) => [
  index('idx_api_keys_user_active').on(table.userId),
  index('idx_api_keys_hash').on(table.keyHash),
]);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// ── AUDIT LOG DE OPERACOES DE ESCRITA VIA API KEY ────────────────

export const apiAuditLogs = pgTable('api_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  statusCode: integer('status_code').notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_api_audit_logs_user_created').on(table.userId, table.createdAt),
  index('idx_api_audit_logs_key_created').on(table.apiKeyId, table.createdAt),
]);

// ── MEMÓRIA DO COACH (contexto persistente p/ sessões de IA via MCP) ──
// "Base" que toda nova sessao do Claude le primeiro. A inteligencia vive no
// Claude; o Endura apenas persiste o que ele produz (analises, diretrizes,
// filosofia). Ver docs/llm-manual.md (fluxo canonico de coaching).

// Contexto vivo de longo prazo — 1 linha por atleta.
export const coachProfile = pgTable('coach_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  philosophy: text('philosophy'),            // abordagem/preferencias de treino
  constraints: jsonb('constraints'),         // lesoes, tempo, equipamento, restricoes declaradas
  currentFocus: text('current_focus'),       // foco atual (ex: "subir FTP, proteger aquiles esq")
  seasonGoal: text('season_goal'),           // meta da temporada
  updatedByKeyId: uuid('updated_by_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const coachProfileRelations = relations(coachProfile, ({ one }) => ({
  user: one(users, { fields: [coachProfile.userId], references: [users.id] }),
}));

// Historico permanente de analises — append-only. Cada analise do Claude = 1 linha.
export const coachAssessments = pgTable('coach_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  raceGoalId: uuid('race_goal_id').references(() => raceGoals.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 30 }).notNull(), // weekly_review | readiness | race_projection | plan_rationale | ad_hoc
  title: varchar('title', { length: 255 }),
  summary: text('summary').notNull(),               // analise legivel por humano
  data: jsonb('data'),                              // achados estruturados (tendencias, numeros, flags)
  periodFrom: date('period_from'),
  periodTo: date('period_to'),
  createdByKeyId: uuid('created_by_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  assessedAt: timestamp('assessed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_coach_assessments_user_assessed').on(table.userId, table.assessedAt),
]);

export const coachAssessmentsRelations = relations(coachAssessments, ({ one }) => ({
  user: one(users, { fields: [coachAssessments.userId], references: [users.id] }),
  raceGoal: one(raceGoals, { fields: [coachAssessments.raceGoalId], references: [raceGoals.id] }),
}));

// Diretrizes ativas — "plano de acao corrente" que a proxima sessao herda.
export const coachDirectives = pgTable('coach_directives', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 20 }).notNull(),     // training | nutrition | recovery | supplementation
  text: text('text').notNull(),
  rationale: text('rationale'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | superseded | done
  supersedesId: uuid('supersedes_id'),                 // self-ref (sem FK p/ evitar ciclo de tipos)
  expiresAt: timestamp('expires_at'),
  createdByKeyId: uuid('created_by_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_coach_directives_user_status').on(table.userId, table.status),
]);

export const coachDirectivesRelations = relations(coachDirectives, ({ one }) => ({
  user: one(users, { fields: [coachDirectives.userId], references: [users.id] }),
}));

// ── CONTEXTO PESSOAL / SAÚDE (médico, plano, exames) ──
// Modulo paralelo a memoria do coach. Persiste contexto clinico relevante p/
// coaching, lido/escrito via MCP com scope dedicado (read:health / write:health).
// PHI: gate por scope; salvar apenas o que o atleta compartilhar. Ver llm-manual.

// Perfil de saude — 1 linha por atleta (upsert).
export const healthProfile = pgTable('health_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  providers: jsonb('providers'),        // [{role, name, registro, specialty, contact}]
  healthPlan: jsonb('health_plan'),     // {name, beneficiaryName, beneficiaryId, phone, email, portalUrl}
  allergies: text('allergies').array(),
  medications: jsonb('medications'),    // [{name, dose, schedule, reason}]
  conditions: text('conditions').array(),
  notes: text('notes'),                 // contexto clinico livre relevante p/ coaching
  updatedByKeyId: uuid('updated_by_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const healthProfileRelations = relations(healthProfile, ({ one }) => ({
  user: one(users, { fields: [healthProfile.userId], references: [users.id] }),
}));

// Exames/documentos — N por atleta, com ciclo de vida (requested -> resulted).
export const healthExams = pgTable('health_exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examType: varchar('exam_type', { length: 40 }).notNull(),                  // lab_panel | ergospirometry | echocardiogram | imaging | other
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('requested'),  // requested | scheduled | collected | resulted | reviewed
  provider: varchar('provider', { length: 255 }),                            // quem pediu / onde
  examDate: date('exam_date'),
  resultDate: date('result_date'),
  items: jsonb('items'),                                                     // exames pedidos: [{name, tuss}]
  summary: text('summary'),                                                  // achados legiveis quando sair resultado
  data: jsonb('data'),                                                       // resultados estruturados (opcional)
  attachmentRef: varchar('attachment_ref', { length: 500 }),                 // link/caminho do PDF (por referencia)
  createdByKeyId: uuid('created_by_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_health_exams_user_date').on(table.userId, table.examDate),
]);

export const healthExamsRelations = relations(healthExams, ({ one }) => ({
  user: one(users, { fields: [healthExams.userId], references: [users.id] }),
}));
