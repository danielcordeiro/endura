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
  planId: uuid('plan_id').notNull().references(() => trainingPlans.id, { onDelete: 'cascade' }),
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
  durationSec: integer('duration_sec'),
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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_activities_user_started').on(table.userId, table.startedAt),
  index('idx_activities_external_id').on(table.externalId, table.source),
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
