import type { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { authenticateApiKey, requireScope } from '../api-key/api-key.middleware.js';
import { logApiWrite } from '../api-key/api-audit-log.service.js';
import * as nutritionService from '../nutrition/nutrition.service.js';
import * as activityService from '../activity/activity.service.js';
import * as dailyCheckinService from '../daily-checkin/daily-checkin.service.js';
import * as analyticsService from './analytics.service.js';
import * as performanceService from '../performance/performance.service.js';
import * as athleteService from '../athlete/athlete.service.js';
import { createRaceGoalBody, updateRaceGoalBody } from '../athlete/athlete.schemas.js';
import {
  createItemBody as createNutritionItemBody,
  updateItemBody as updateNutritionItemBody,
  bulkItemsBody as bulkNutritionItemsBody,
  catalogSearchQuery,
  followProtocolBody,
} from '../nutrition/nutrition.schemas.js';

// ── Helpers ───────────────────────────────────────────────────────

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const uuidParams = z.object({ id: z.string().uuid('ID invalido') });
const nutritionItemParams = z.object({
  id: z.string().uuid('ID invalido'),
  itemId: z.string().uuid('itemId invalido'),
});

const feedbackBody = z.object({
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
  adverseEvents: z.array(z.string().max(100)).max(20).optional(),
}).strict().refine(
  (v) => v.perceivedEffort !== undefined || v.notes !== undefined || v.adverseEvents !== undefined,
  { message: 'Pelo menos um campo deve ser informado' },
);

const dailyCheckinBody = z.object({
  date: z.string().regex(dateRe, 'date deve ser YYYY-MM-DD').optional(),
  feeling: z.number().int().min(1).max(5),
  muscleSoreness: z.number().int().min(1).max(5),
  injuryNote: z.string().max(500).nullable().optional(),
}).strict();

function parseDateRange(q: { from?: string; to?: string }, defaultDays = 30): { from: string; to: string } | null {
  const today = new Date();
  const to = q.to && dateRe.test(q.to) ? q.to : today.toISOString().split('T')[0]!;
  const from = q.from && dateRe.test(q.from)
    ? q.from
    : new Date(today.getTime() - defaultDays * 86400000).toISOString().split('T')[0]!;
  if (from > to) return null;
  return { from, to };
}

function parsePagination(q: { limit?: string; offset?: string }): { limit: number; offset: number } {
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
  const offset = Math.max(0, Number(q.offset) || 0);
  return { limit, offset };
}

// ── Schemas: memória do coach + escrita de plano ─────────────────────
const dateStr = z.string().regex(dateRe, 'data deve ser YYYY-MM-DD');
const disciplineEnum = z.enum(['run', 'bike', 'swim', 'other', 'brick']);

const coachProfileBody = z.object({
  philosophy: z.string().max(8000).nullable().optional(),
  constraints: z.record(z.any()).nullable().optional(),
  currentFocus: z.string().max(4000).nullable().optional(),
  seasonGoal: z.string().max(4000).nullable().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'Informe ao menos um campo' });

const coachAssessmentBody = z.object({
  type: z.enum(['weekly_review', 'readiness', 'race_projection', 'plan_rationale', 'ad_hoc']),
  title: z.string().max(255).optional(),
  summary: z.string().min(1).max(20000),
  data: z.record(z.any()).optional(),
  periodFrom: dateStr.optional(),
  periodTo: dateStr.optional(),
  raceGoalId: z.string().uuid().optional(),
}).strict();

const coachDirectiveBody = z.object({
  kind: z.enum(['training', 'nutrition', 'recovery', 'supplementation']),
  text: z.string().min(1).max(4000),
  rationale: z.string().max(4000).optional(),
  supersedesId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
}).strict();

const coachDirectivePatchBody = z.object({
  status: z.enum(['active', 'superseded', 'done']),
}).strict();

// ── Schemas: contexto pessoal / saude (PHI) ─────────────────────────
const providerSchema = z.object({
  role: z.enum(['sports_doctor', 'physio', 'nutritionist', 'cardiologist', 'physician', 'other']).optional(),
  name: z.string().min(1).max(255),
  registro: z.string().max(60).optional(),
  specialty: z.string().max(120).optional(),
  contact: z.string().max(255).optional(),
}).strict();

const healthPlanSchema = z.object({
  name: z.string().min(1).max(120),
  beneficiaryName: z.string().max(255).optional(),
  beneficiaryId: z.string().max(60).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(255).optional(),
  portalUrl: z.string().max(500).optional(),
}).strict();

const medicationSchema = z.object({
  name: z.string().min(1).max(255),
  dose: z.string().max(120).optional(),
  schedule: z.string().max(120).optional(),
  reason: z.string().max(255).optional(),
}).strict();

const healthProfileBody = z.object({
  providers: z.array(providerSchema).max(20).nullable().optional(),
  healthPlan: healthPlanSchema.nullable().optional(),
  allergies: z.array(z.string().max(120)).max(50).nullable().optional(),
  medications: z.array(medicationSchema).max(50).nullable().optional(),
  conditions: z.array(z.string().max(200)).max(50).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'Informe ao menos um campo' });

const examItemSchema = z.object({
  name: z.string().min(1).max(200),
  tuss: z.string().max(20).optional(),
}).strict();

const healthExamStatusEnum = z.enum(['requested', 'scheduled', 'collected', 'resulted', 'reviewed']);
const healthExamTypeEnum = z.enum(['lab_panel', 'ergospirometry', 'echocardiogram', 'imaging', 'other']);

const healthExamBody = z.object({
  examType: healthExamTypeEnum,
  title: z.string().max(255).optional(),
  status: healthExamStatusEnum.optional(),
  provider: z.string().max(255).optional(),
  examDate: dateStr.optional(),
  resultDate: dateStr.optional(),
  items: z.array(examItemSchema).max(100).optional(),
  summary: z.string().max(20000).optional(),
  data: z.record(z.any()).optional(),
  attachmentRef: z.string().max(500).optional(),
}).strict();

const healthExamPatchBody = z.object({
  status: healthExamStatusEnum.optional(),
  title: z.string().max(255).nullable().optional(),
  provider: z.string().max(255).nullable().optional(),
  examDate: dateStr.nullable().optional(),
  resultDate: dateStr.nullable().optional(),
  items: z.array(examItemSchema).max(100).nullable().optional(),
  summary: z.string().max(20000).nullable().optional(),
  data: z.record(z.any()).nullable().optional(),
  attachmentRef: z.string().max(500).nullable().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: 'Informe ao menos um campo' });

const trainingPlanBody = z.object({
  raceGoalId: z.string().uuid().optional(),
  currentPhase: z.enum(['base', 'build', 'peak', 'taper']).optional(),
  startDate: dateStr,
  endDate: dateStr,
  totalWeeks: z.number().int().min(1).max(104).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
}).strict();

const plannedWorkoutFields = z.object({
  planId: z.string().uuid().nullable().optional(),
  scheduledDate: dateStr,
  discipline: disciplineEnum,
  title: z.string().max(255).optional(),
  description: z.string().max(8000).optional(),
  structure: z.record(z.any()).optional(),
  durationMin: z.number().int().min(0).max(2000).optional(),
  distanceM: z.number().int().min(0).optional(),
  intensityZone: z.string().max(10).optional(),
  tssEstimate: z.number().min(0).max(2000).optional(),
  week: z.number().int().min(0).max(104).optional(),
  phase: z.enum(['base', 'build', 'peak', 'taper']).optional(),
});

const plannedWorkoutsBulkBody = z.object({
  workouts: z.array(plannedWorkoutFields).min(1).max(80),
}).strict();

const plannedWorkoutUpdateBody = plannedWorkoutFields.partial().strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Informe ao menos um campo' });

const workoutNutritionItemSchema = z.object({
  phase: z.string().max(20),
  minuteOffset: z.number().int().optional(),
  productName: z.string().max(255),
  brand: z.string().max(100).optional(),
  quantity: z.number().optional(),
  unit: z.string().max(20).optional(),
  carbsG: z.number().optional(),
  sodiumMg: z.number().optional(),
  caffeineMg: z.number().optional(),
  kcal: z.number().int().optional(),
}).passthrough();

const workoutNutritionBody = z.object({
  items: z.array(workoutNutritionItemSchema).min(1).max(40),
  totalCarbsG: z.number().optional(),
  totalSodiumMg: z.number().optional(),
  totalCaffeineMg: z.number().optional(),
  totalKcal: z.number().int().optional(),
  weatherContext: z.record(z.any()).optional(),
}).strict();

// Converte número→string para colunas `numeric` (drizzle exige string).
function numOrNull(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null : String(v);
}

// ── Plugin ────────────────────────────────────────────────────────

export default async function publicApiRoutes(app: FastifyInstance): Promise<void> {
  // Todas as rotas sob este plugin exigem API Key
  app.addHook('onRequest', authenticateApiKey);

  // Audit log de operacoes de ESCRITA via API Key (fire-and-forget).
  // Reads nao sao logados para nao poluir DB nem aumentar latencia.
  app.addHook('onResponse', async (request, reply) => {
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
    if (!request.userId) return; // request rejeitada antes de autenticar
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    logApiWrite({
      apiKeyId: request.apiKeyId ?? null,
      userId: request.userId,
      method,
      path: request.routeOptions?.url ?? request.url,
      statusCode: reply.statusCode,
      resourceId: params.id ?? params.itemId ?? null,
    });
  });

  // ── GET /api/v1/public/me ──────────────────────────────────
  app.get('/api/v1/public/me', { onRequest: requireScope('read:profile') }, async (request, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, request.userId),
      columns: { id: true, email: true, name: true, role: true, createdAt: true },
      with: { athleteProfile: true },
    });

    if (!user) {
      return reply.code(404).send({ code: 'ERR_USER_NOT_FOUND', message: 'Usuario nao encontrado', status: 404 });
    }

    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        profile: user.athleteProfile ?? null,
      },
    });
  });

  // ── GET /api/v1/public/activities ──────────────────────────
  app.get<{ Querystring: { from?: string; to?: string; discipline?: string; limit?: string; offset?: string } }>(
    '/api/v1/public/activities',
    { onRequest: requireScope('read:activities') },
    async (request, reply) => {
      const range = parseDateRange(request.query, 90);
      if (!range) {
        return reply.code(400).send({ code: 'ERR_INVALID_RANGE', message: 'from > to', status: 400 });
      }
      const { limit, offset } = parsePagination(request.query);
      const fromDate = new Date(range.from + 'T00:00:00');
      const toDate = new Date(range.to + 'T23:59:59');

      const conditions = [
        eq(schema.activities.userId, request.userId),
        gte(schema.activities.startedAt, fromDate),
        lte(schema.activities.startedAt, toDate),
      ];
      if (request.query.discipline) {
        conditions.push(eq(schema.activities.discipline, request.query.discipline));
      }

      const rows = await db.query.activities.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.activities.startedAt)],
        limit,
        offset,
      });

      return reply.send({
        data: {
          range,
          pagination: { limit, offset, count: rows.length },
          items: rows.map((a) => ({
            id: a.id,
            source: a.source,
            externalId: a.externalId,
            discipline: a.discipline,
            title: a.title,
            startedAt: a.startedAt,
            durationSec: a.durationSec,
            distanceM: a.distanceM != null ? Number(a.distanceM) : null,
            avgHr: a.avgHr,
            maxHr: a.maxHr,
            avgPowerW: a.avgPowerW,
            elevationM: a.elevationM != null ? Number(a.elevationM) : null,
            calories: a.calories,
            perceivedEffort: a.perceivedEffort,
            plannedWorkoutId: a.plannedWorkoutId,
          })),
        },
      });
    },
  );

  // ── GET /api/v1/public/activities/:id ──────────────────────
  app.get<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id',
    { onRequest: requireScope('read:activities') },
    async (request, reply) => {
      const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }

      const activity = await db.query.activities.findFirst({
        where: and(
          eq(schema.activities.id, parsed.data.id),
          eq(schema.activities.userId, request.userId),
        ),
      });
      if (!activity) {
        return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 });
      }
      return reply.send({ data: activity });
    },
  );

  // ── GET /api/v1/public/planned-workouts ────────────────────
  app.get<{ Querystring: { from?: string; to?: string; discipline?: string; limit?: string; offset?: string } }>(
    '/api/v1/public/planned-workouts',
    { onRequest: requireScope('read:planned') },
    async (request, reply) => {
      const range = parseDateRange(request.query, 30);
      if (!range) {
        return reply.code(400).send({ code: 'ERR_INVALID_RANGE', message: 'from > to', status: 400 });
      }
      const { limit, offset } = parsePagination(request.query);

      const conditions = [
        eq(schema.plannedWorkouts.userId, request.userId),
        gte(schema.plannedWorkouts.scheduledDate, range.from),
        lte(schema.plannedWorkouts.scheduledDate, range.to),
      ];
      if (request.query.discipline) {
        conditions.push(eq(schema.plannedWorkouts.discipline, request.query.discipline));
      }

      const rows = await db.query.plannedWorkouts.findMany({
        where: and(...conditions),
        orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
        limit,
        offset,
      });

      return reply.send({
        data: {
          range,
          pagination: { limit, offset, count: rows.length },
          items: rows.map((w) => ({
            id: w.id,
            scheduledDate: w.scheduledDate,
            discipline: w.discipline,
            title: w.title,
            description: w.description,
            durationMin: w.durationMin,
            distanceM: w.distanceM,
            intensityZone: w.intensityZone,
            tssEstimate: w.tssEstimate != null ? Number(w.tssEstimate) : null,
            sentToWatch: w.sentToWatch,
            intervalsWorkoutId: w.intervalsWorkoutId,
            planId: w.planId,
            week: w.week,
            phase: w.phase,
          })),
        },
      });
    },
  );

  // ── GET /api/v1/public/planned-workouts/:id ────────────────
  app.get<{ Params: { id: string } }>(
    '/api/v1/public/planned-workouts/:id',
    { onRequest: requireScope('read:planned') },
    async (request, reply) => {
      const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }

      const workout = await db.query.plannedWorkouts.findFirst({
        where: and(
          eq(schema.plannedWorkouts.id, parsed.data.id),
          eq(schema.plannedWorkouts.userId, request.userId),
        ),
        with: { nutritionProtocol: true },
      });
      if (!workout) {
        return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Treino planejado nao encontrado', status: 404 });
      }
      return reply.send({ data: workout });
    },
  );

  // ── GET /api/v1/public/wellness ────────────────────────────
  // Metricas diarias (HRV, sono, peso, etc.)
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/api/v1/public/wellness',
    { onRequest: requireScope('read:wellness') },
    async (request, reply) => {
      const range = parseDateRange(request.query, 30);
      if (!range) {
        return reply.code(400).send({ code: 'ERR_INVALID_RANGE', message: 'from > to', status: 400 });
      }

      const rows = await db.query.dailyMetrics.findMany({
        where: and(
          eq(schema.dailyMetrics.userId, request.userId),
          gte(schema.dailyMetrics.date, range.from),
          lte(schema.dailyMetrics.date, range.to),
        ),
        orderBy: [asc(schema.dailyMetrics.date)],
      });

      return reply.send({
        data: {
          range,
          items: rows.map((m) => ({
            date: m.date,
            hrvMs: m.hrvMs != null ? Number(m.hrvMs) : null,
            hrvBaseline: m.hrvBaseline != null ? Number(m.hrvBaseline) : null,
            hrvStatus: m.hrvStatus,
            restingHr: m.restingHr,
            sleepDurationH: m.sleepDurationH != null ? Number(m.sleepDurationH) : null,
            sleepScore: m.sleepScore,
            spo2: m.spo2,
            stressLevel: m.stressLevel,
            bodyBattery: m.bodyBattery,
            weightKg: m.weightKg != null ? Number(m.weightKg) : null,
            vo2max: m.vo2max != null ? Number(m.vo2max) : null,
            respirationRate: m.respirationRate != null ? Number(m.respirationRate) : null,
            intervalsReadiness: m.intervalsReadiness != null ? Number(m.intervalsReadiness) : null,
            source: m.source,
          })),
        },
      });
    },
  );

  // ── GET /api/v1/public/performance/pmc ─────────────────────
  // Performance Management Chart — CTL / ATL / TSB
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/api/v1/public/performance/pmc',
    { onRequest: requireScope('read:wellness') },
    async (request, reply) => {
      const range = parseDateRange(request.query, 90);
      if (!range) {
        return reply.code(400).send({ code: 'ERR_INVALID_RANGE', message: 'from > to', status: 400 });
      }

      // PMC é calculado AO VIVO a partir das atividades (fonte de verdade).
      // As colunas ctl/atl/tsb em daily_metrics nunca são populadas — não ler delas.
      // A janela de histórico precisa ser longa o suficiente p/ o ramp-up do CTL
      // (constante de 42d) estabilizar — senão um range curto subestima o CTL.
      // Usamos >= 90d (igual a race-projection/coach-context) e filtramos o range.
      const todayStr = new Date().toISOString().split('T')[0]!;
      const spanDays = Math.ceil(
        (new Date(todayStr + 'T00:00:00').getTime() - new Date(range.from + 'T00:00:00').getTime()) / 86400000,
      ) + 1;
      const pmc = await performanceService.calculatePMC(request.userId, Math.max(spanDays, 90));
      const items = pmc.metrics
        .filter((m) => m.date >= range.from && m.date <= range.to)
        .map((m) => ({ date: m.date, tss: m.tss, ctl: m.ctl, atl: m.atl, tsb: m.tsb }));

      return reply.send({ data: { range, items } });
    },
  );

  // ── GET /api/v1/public/performance/pmc-forecast ────────────
  // Projeção de forma: CTL/ATL/TSB ADIANTE até o dia da prova, a partir
  // dos treinos planejados, com avaliação de pico (TSB ideal). É o que
  // o Claude usa para responder "vou chegar na forma certa pro Nice?" e
  // ajustar o plano. horizonDays opcional (1..240); default = até a prova.
  app.get<{ Querystring: { horizonDays?: string } }>(
    '/api/v1/public/performance/pmc-forecast',
    { onRequest: requireScope('read:wellness') },
    async (request, reply) => {
      const raw = request.query.horizonDays ? Number(request.query.horizonDays) : undefined;
      const horizonDays =
        raw !== undefined && Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 240) : undefined;
      const result = await performanceService.projectPMC(request.userId, { horizonDays });
      return reply.send({ data: result });
    },
  );

  // ── GET /api/v1/public/performance/recovery ────────────────
  // Recovery score estilo WHOOP: recuperação fisiológica (HRV/FC repouso/
  // sono/FR) vs baseline pessoal, com banda verde/amarelo/vermelho.
  app.get('/api/v1/public/performance/recovery', { onRequest: requireScope('read:wellness') }, async (request, reply) => {
    const data = await performanceService.computeRecoveryScore(request.userId);
    return reply.send({ data });
  });

  // ── GET /api/v1/public/performance/readiness ───────────────
  app.get('/api/v1/public/performance/readiness', { onRequest: requireScope('read:wellness') }, async (request, reply) => {
    const userId = request.userId;
    const todayStr = new Date().toISOString().split('T')[0]!;
    // ctl/atl/tsb ao vivo (calculatePMC); readiness do check-in de hoje (fonte real).
    const [rows, pmc, todayCheckin] = await Promise.all([
      db.query.dailyMetrics.findMany({
        where: eq(schema.dailyMetrics.userId, userId),
        orderBy: [desc(schema.dailyMetrics.date)],
        limit: 1,
      }),
      performanceService.calculatePMC(userId),
      db.query.dailyCheckins.findFirst({
        where: and(eq(schema.dailyCheckins.userId, userId), eq(schema.dailyCheckins.date, todayStr)),
      }),
    ]);

    const latest = rows[0];
    if (!latest) {
      return reply.send({ data: null });
    }

    // loadTarget (strain target): faixa de TSS-alvo pra hoje, derivada do PMC ao
    // vivo. Usa o nível do check-in se houver; senão, fallback determinístico
    // por TSB (sem chamada de IA, mantendo o endpoint público leve e barato).
    const effectiveLevel =
      (todayCheckin?.readinessLevel as 'intense' | 'moderate' | 'light' | 'rest' | null | undefined) ??
      performanceService.quickReadinessLevel(pmc.currentTSB);
    const loadTarget = performanceService.computeLoadTarget(effectiveLevel, pmc.currentCTL);

    return reply.send({
      data: {
        date: latest.date,
        readinessScore: todayCheckin?.readinessScore ?? null,
        readinessLevel: todayCheckin?.readinessLevel ?? null,
        loadTarget,
        fatigueScore: latest.fatigueScore != null ? Number(latest.fatigueScore) : null,
        mentorRecommendation: todayCheckin?.recommendation ?? latest.mentorRecommendation,
        ctl: pmc.currentCTL,
        atl: pmc.currentATL,
        tsb: pmc.currentTSB,
        hrvMs: latest.hrvMs != null ? Number(latest.hrvMs) : null,
        hrvStatus: latest.hrvStatus,
        restingHr: latest.restingHr,
        sleepScore: latest.sleepScore,
        vo2max: latest.vo2max != null ? Number(latest.vo2max) : null,
        respirationRate: latest.respirationRate != null ? Number(latest.respirationRate) : null,
        intervalsReadiness: latest.intervalsReadiness != null ? Number(latest.intervalsReadiness) : null,
      },
    });
  });

  // ── GET /api/v1/public/race-goals ──────────────────────────
  app.get('/api/v1/public/race-goals', { onRequest: requireScope('read:profile') }, async (request, reply) => {
    const rows = await db.query.raceGoals.findMany({
      where: eq(schema.raceGoals.userId, request.userId),
      orderBy: [asc(schema.raceGoals.raceDate)],
    });
    return reply.send({ data: rows });
  });

  // ── POST /api/v1/public/race-goals ─────────────────────────
  // Registra uma prova no calendário (A/B/C). Criar prova A rebaixa a A anterior para B.
  app.post('/api/v1/public/race-goals', { onRequest: requireScope('write:planned') }, async (request, reply) => {
    const body = createRaceGoalBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    const goal = await athleteService.createRaceGoal(request.userId, body.data);
    return reply.code(201).send({ data: goal });
  });

  // ── PUT /api/v1/public/race-goals/:id ──────────────────────
  app.put<{ Params: { id: string } }>(
    '/api/v1/public/race-goals/:id',
    { onRequest: requireScope('write:planned') },
    async (request, reply) => {
      const body = updateRaceGoalBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
      }
      try {
        const goal = await athleteService.updateRaceGoal(request.userId, request.params.id, body.data);
        return reply.send({ data: goal });
      } catch (err) {
        const e = err as { code?: string; message?: string; status?: number };
        return reply.code(e.status ?? 500).send({ code: e.code ?? 'ERR_INTERNAL', message: e.message ?? 'Erro', status: e.status ?? 500 });
      }
    },
  );

  // ── DELETE /api/v1/public/race-goals/:id ───────────────────
  app.delete<{ Params: { id: string } }>(
    '/api/v1/public/race-goals/:id',
    { onRequest: requireScope('write:planned') },
    async (request, reply) => {
      try {
        const result = await athleteService.deleteRaceGoal(request.userId, request.params.id);
        return reply.send({ data: result });
      } catch (err) {
        const e = err as { code?: string; message?: string; status?: number };
        return reply.code(e.status ?? 500).send({ code: e.code ?? 'ERR_INTERNAL', message: e.message ?? 'Erro', status: e.status ?? 500 });
      }
    },
  );

  // ── GET /api/v1/public/fitness-tests ───────────────────────
  app.get('/api/v1/public/fitness-tests', { onRequest: requireScope('read:wellness') }, async (request, reply) => {
    const rows = await db.query.fitnessTests.findMany({
      where: eq(schema.fitnessTests.userId, request.userId),
      orderBy: [desc(schema.fitnessTests.testDate)],
    });
    return reply.send({ data: rows });
  });

  // ── GET /api/v1/public/summary ─────────────────────────────
  // Snapshot conveniente: proximo treino, atividade de hoje, wellness recente, prova alvo
  app.get('/api/v1/public/summary', { onRequest: requireScope('read:profile') }, async (request, reply) => {
    const userId = request.userId;
    const todayStr = new Date().toISOString().split('T')[0]!;
    const todayStart = new Date(todayStr + 'T00:00:00');
    const todayEnd = new Date(todayStr + 'T23:59:59');

    const [nextWorkout, todayActivity, latestWellness, activeRace, pmc, todayCheckin] = await Promise.all([
      db.query.plannedWorkouts.findFirst({
        where: and(
          eq(schema.plannedWorkouts.userId, userId),
          gte(schema.plannedWorkouts.scheduledDate, todayStr),
        ),
        orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
      }),
      db.query.activities.findFirst({
        where: and(
          eq(schema.activities.userId, userId),
          gte(schema.activities.startedAt, todayStart),
          lte(schema.activities.startedAt, todayEnd),
        ),
        orderBy: [desc(schema.activities.startedAt)],
      }),
      db.query.dailyMetrics.findFirst({
        where: eq(schema.dailyMetrics.userId, userId),
        orderBy: [desc(schema.dailyMetrics.date)],
      }),
      athleteService.getActiveRaceGoalOrNull(userId),
      performanceService.calculatePMC(userId),
      db.query.dailyCheckins.findFirst({
        where: and(eq(schema.dailyCheckins.userId, userId), eq(schema.dailyCheckins.date, todayStr)),
      }),
    ]);

    return reply.send({
      data: {
        today: todayStr,
        nextPlannedWorkout: nextWorkout
          ? {
              id: nextWorkout.id,
              scheduledDate: nextWorkout.scheduledDate,
              discipline: nextWorkout.discipline,
              title: nextWorkout.title,
              durationMin: nextWorkout.durationMin,
              distanceM: nextWorkout.distanceM,
              tssEstimate: nextWorkout.tssEstimate != null ? Number(nextWorkout.tssEstimate) : null,
            }
          : null,
        todayActivity: todayActivity
          ? {
              id: todayActivity.id,
              discipline: todayActivity.discipline,
              title: todayActivity.title,
              startedAt: todayActivity.startedAt,
              durationSec: todayActivity.durationSec,
              distanceM: todayActivity.distanceM != null ? Number(todayActivity.distanceM) : null,
              avgHr: todayActivity.avgHr,
              calories: todayActivity.calories,
            }
          : null,
        latestWellness: latestWellness
          ? {
              date: latestWellness.date,
              hrvMs: latestWellness.hrvMs != null ? Number(latestWellness.hrvMs) : null,
              restingHr: latestWellness.restingHr,
              sleepScore: latestWellness.sleepScore,
              readinessScore: todayCheckin?.readinessScore ?? null,
              readinessLevel: todayCheckin?.readinessLevel ?? null,
              ctl: pmc.currentCTL,
              atl: pmc.currentATL,
              tsb: pmc.currentTSB,
            }
          : null,
        activeRace: activeRace
          ? {
              id: activeRace.id,
              raceName: activeRace.raceName,
              raceDate: activeRace.raceDate,
              distance: activeRace.distance,
              goal: activeRace.goal,
              targetTimeSec: activeRace.targetTime,
            }
          : null,
      },
    });
  });

  // ── GET /api/v1/public/activities/:id/nutrition ───────────
  // Log + items + comparison vs protocolo prescrito.
  app.get<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/nutrition',
    { onRequest: requireScope('read:activities') },
    async (request, reply) => {
      const parsed = uuidParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const [log, comparison] = await Promise.all([
        nutritionService.getNutritionLog(request.userId, parsed.data.id),
        nutritionService.getComparison(request.userId, parsed.data.id).catch(() => null),
      ]);
      return reply.send({ data: { log, comparison } });
    },
  );

  // ── GET /api/v1/public/nutrition/catalog/search ───────────
  app.get<{ Querystring: { q?: string; category?: string; limit?: string } }>(
    '/api/v1/public/nutrition/catalog/search',
    { onRequest: requireScope('read:catalog') },
    async (request, reply) => {
      const parsed = catalogSearchQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: parsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }
      const products = await nutritionService.searchCatalog(
        parsed.data.q,
        parsed.data.category,
        parsed.data.limit,
      );
      return reply.send({ data: products });
    },
  );

  // ── POST /api/v1/public/activities/:id/nutrition-items ─────
  app.post<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/nutrition-items',
    { onRequest: requireScope('write:nutrition') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const body = createNutritionItemBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      try {
        const item = await nutritionService.addItem(request.userId, params.data.id, body.data);
        return reply.code(201).send({ data: item });
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── POST /api/v1/public/activities/:id/nutrition-items/bulk
  app.post<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/nutrition-items/bulk',
    { onRequest: requireScope('write:nutrition') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const body = bulkNutritionItemsBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      try {
        const result = await nutritionService.addItemsBulk(request.userId, params.data.id, body.data);
        return reply.code(201).send({ data: result });
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── PUT /api/v1/public/activities/:id/nutrition-items/:itemId
  app.put<{ Params: { id: string; itemId: string } }>(
    '/api/v1/public/activities/:id/nutrition-items/:itemId',
    { onRequest: requireScope('write:nutrition') },
    async (request, reply) => {
      const params = nutritionItemParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'Parametros invalidos', status: 400 });
      }
      const body = updateNutritionItemBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      try {
        const item = await nutritionService.updateItem(
          request.userId,
          params.data.id,
          params.data.itemId,
          body.data,
        );
        return reply.send({ data: item });
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── DELETE /api/v1/public/activities/:id/nutrition-items/:itemId
  app.delete<{ Params: { id: string; itemId: string } }>(
    '/api/v1/public/activities/:id/nutrition-items/:itemId',
    { onRequest: requireScope('write:nutrition') },
    async (request, reply) => {
      const params = nutritionItemParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'Parametros invalidos', status: 400 });
      }
      try {
        await nutritionService.deleteItem(request.userId, params.data.id, params.data.itemId);
        return reply.code(204).send();
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── POST /api/v1/public/activities/:id/follow-protocol ─────
  app.post<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/follow-protocol',
    { onRequest: requireScope('write:nutrition') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const body = followProtocolBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      try {
        const log = await nutritionService.followProtocol(
          request.userId,
          params.data.id,
          body.data.protocolId,
        );
        return reply.code(201).send({ data: log });
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── POST /api/v1/public/activities/:id/feedback ────────────
  app.post<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/feedback',
    { onRequest: requireScope('write:checkin') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const body = feedbackBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      try {
        const updated = await activityService.updateFeedback(request.userId, params.data.id, body.data);
        return reply.send({
          data: {
            id: updated.id,
            perceivedEffort: updated.perceivedEffort,
            notes: updated.notes,
            adverseEvents: updated.adverseEvents,
          },
        });
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── POST /api/v1/public/daily-checkin ──────────────────────
  app.post(
    '/api/v1/public/daily-checkin',
    { onRequest: requireScope('write:checkin') },
    async (request, reply) => {
      const body = dailyCheckinBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      const date = body.data.date ?? new Date().toISOString().split('T')[0]!;
      try {
        const checkin = await dailyCheckinService.upsertDailyCheckin(request.userId, {
          date,
          feeling: body.data.feeling,
          muscleSoreness: body.data.muscleSoreness,
          injuryNote: body.data.injuryNote ?? null,
        });
        return reply.code(201).send({ data: checkin });
      } catch (err) {
        return handleServiceError(err, reply);
      }
    },
  );

  // ── GET /api/v1/public/daily-checkin ───────────────────────
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/api/v1/public/daily-checkin',
    { onRequest: requireScope('read:wellness') },
    async (request, reply) => {
      const range = parseDateRange(request.query, 30);
      if (!range) {
        return reply.code(400).send({ code: 'ERR_INVALID_RANGE', message: 'from > to', status: 400 });
      }
      const items = await dailyCheckinService.listDailyCheckins(request.userId, range.from, range.to);
      return reply.send({ data: { range, items } });
    },
  );

  // ── GET /api/v1/public/activities/:id/insights ─────────────
  app.get<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/insights',
    { onRequest: requireScope('read:activities') },
    async (request, reply) => {
      const parsed = uuidParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      // Verifica ownership da activity (insight join activity)
      const activity = await db.query.activities.findFirst({
        where: and(
          eq(schema.activities.id, parsed.data.id),
          eq(schema.activities.userId, request.userId),
        ),
        columns: { id: true },
      });
      if (!activity) {
        return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 });
      }
      const insights = await db.query.aiInsights.findMany({
        where: eq(schema.aiInsights.activityId, parsed.data.id),
        orderBy: [desc(schema.aiInsights.createdAt)],
      });
      return reply.send({ data: insights });
    },
  );

  // ── GET /api/v1/public/activities/:id/comments ─────────────
  app.get<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/comments',
    { onRequest: requireScope('read:activities') },
    async (request, reply) => {
      const parsed = uuidParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const activity = await db.query.activities.findFirst({
        where: and(
          eq(schema.activities.id, parsed.data.id),
          eq(schema.activities.userId, request.userId),
        ),
        columns: { id: true },
      });
      if (!activity) {
        return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 });
      }
      const rows = await db.query.activityComments.findMany({
        where: eq(schema.activityComments.activityId, parsed.data.id),
        orderBy: [asc(schema.activityComments.createdAt)],
      });
      return reply.send({ data: rows });
    },
  );

  // ── POST /api/v1/public/activities/:id/comments ────────────
  app.post<{ Params: { id: string } }>(
    '/api/v1/public/activities/:id/comments',
    { onRequest: requireScope('write:comments') },
    async (request, reply) => {
      const parsed = uuidParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      }
      const body = z.object({ text: z.string().min(1).max(2000) }).strict().safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: body.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }
      const activity = await db.query.activities.findFirst({
        where: and(
          eq(schema.activities.id, parsed.data.id),
          eq(schema.activities.userId, request.userId),
        ),
        columns: { id: true },
      });
      if (!activity) {
        return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 });
      }
      const [comment] = await db.insert(schema.activityComments).values({
        activityId: parsed.data.id,
        authorId: request.userId,
        text: body.data.text,
      }).returning();
      return reply.code(201).send({ data: comment });
    },
  );

  // ── GET /api/v1/public/nutrition/presets ───────────────────
  app.get(
    '/api/v1/public/nutrition/presets',
    { onRequest: requireScope('read:catalog') },
    async (request, reply) => {
      const presets = await nutritionService.listPresets(request.userId);
      return reply.send({ data: presets });
    },
  );

  // ── GET /api/v1/public/analytics/weekly ────────────────────
  app.get<{ Querystring: { weeks?: string } }>(
    '/api/v1/public/analytics/weekly',
    { onRequest: requireScope('read:wellness') },
    async (request, reply) => {
      const weeks = Math.max(1, Math.min(52, Number(request.query.weeks) || 8));
      const buckets = await analyticsService.getWeeklyAnalytics(request.userId, weeks);
      return reply.send({ data: { weeks, items: buckets } });
    },
  );

  // ── GET /api/v1/public/analytics/nutrition-summary ────────
  app.get<{ Querystring: { days?: string } }>(
    '/api/v1/public/analytics/nutrition-summary',
    { onRequest: requireScope('read:wellness') },
    async (request, reply) => {
      const days = Math.max(7, Math.min(365, Number(request.query.days) || 30));
      const summary = await analyticsService.getNutritionSummary(request.userId, days);
      return reply.send({ data: { days, items: summary } });
    },
  );

  // ═══════════════════════════════════════════════════════════════════
  // MEMÓRIA DO COACH — contexto persistente para sessões de IA (MCP)
  // ═══════════════════════════════════════════════════════════════════

  // ── GET /api/v1/public/coach/context ───────────────────────────────
  // Endpoint ÂNCORA: tudo que uma nova sessão precisa para ter "base".
  // Chame isto PRIMEIRO em toda sessão de coaching.
  app.get('/api/v1/public/coach/context', { onRequest: requireScope('read:coach') }, async (request, reply) => {
    const userId = request.userId;
    const todayStr = new Date().toISOString().split('T')[0]!;
    const todayStart = new Date(todayStr + 'T00:00:00');
    const todayEnd = new Date(todayStr + 'T23:59:59');

    const [profile, directives, assessments, athlete, nextWorkout, todayActivity, latestWellness, activeRace, pmc, todayCheckin, healthProf, recentExams] = await Promise.all([
      db.query.coachProfile.findFirst({ where: eq(schema.coachProfile.userId, userId) }),
      db.query.coachDirectives.findMany({
        where: and(eq(schema.coachDirectives.userId, userId), eq(schema.coachDirectives.status, 'active')),
        orderBy: [desc(schema.coachDirectives.createdAt)],
      }),
      db.query.coachAssessments.findMany({
        where: eq(schema.coachAssessments.userId, userId),
        orderBy: [desc(schema.coachAssessments.assessedAt)],
        limit: 10,
      }),
      db.query.athleteProfiles.findFirst({ where: eq(schema.athleteProfiles.userId, userId) }),
      db.query.plannedWorkouts.findFirst({
        where: and(eq(schema.plannedWorkouts.userId, userId), gte(schema.plannedWorkouts.scheduledDate, todayStr)),
        orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
      }),
      db.query.activities.findFirst({
        where: and(
          eq(schema.activities.userId, userId),
          gte(schema.activities.startedAt, todayStart),
          lte(schema.activities.startedAt, todayEnd),
        ),
        orderBy: [desc(schema.activities.startedAt)],
      }),
      db.query.dailyMetrics.findFirst({
        where: eq(schema.dailyMetrics.userId, userId),
        orderBy: [desc(schema.dailyMetrics.date)],
      }),
      athleteService.getActiveRaceGoalOrNull(userId),
      performanceService.calculatePMC(userId),
      db.query.dailyCheckins.findFirst({
        where: and(eq(schema.dailyCheckins.userId, userId), eq(schema.dailyCheckins.date, todayStr)),
      }),
      db.query.healthProfile.findFirst({ where: eq(schema.healthProfile.userId, userId) }),
      db.query.healthExams.findMany({
        where: eq(schema.healthExams.userId, userId),
        orderBy: [desc(schema.healthExams.examDate), desc(schema.healthExams.createdAt)],
        limit: 5,
      }),
    ]);

    return reply.send({
      data: {
        profile: profile ?? null,
        activeDirectives: directives,
        recentAssessments: assessments,
        health: {
          profile: healthProf ?? null,
          recentExams,
          // "Ensino": quando vazio, instrui o Claude a coletar e salvar o contexto de saude.
          guidance: healthProf
            ? null
            : 'Nenhum contexto de saude salvo. Pergunte ao atleta sobre medico responsavel, plano de saude, alergias/medicacoes/condicoes e exames recentes (pedidos ou resultados) e persista com endura_save_health_profile e endura_add_exam.',
        },
        snapshot: {
          today: todayStr,
          athleteProfile: athlete ?? null,
          nextPlannedWorkout: nextWorkout
            ? { id: nextWorkout.id, scheduledDate: nextWorkout.scheduledDate, discipline: nextWorkout.discipline, title: nextWorkout.title, durationMin: nextWorkout.durationMin }
            : null,
          todayActivity: todayActivity
            ? { id: todayActivity.id, discipline: todayActivity.discipline, title: todayActivity.title, startedAt: todayActivity.startedAt }
            : null,
          latestWellness: latestWellness
            ? {
                date: latestWellness.date,
                readinessScore: todayCheckin?.readinessScore ?? null,
                readinessLevel: todayCheckin?.readinessLevel ?? null,
                ctl: pmc.currentCTL,
                atl: pmc.currentATL,
                tsb: pmc.currentTSB,
                hrvMs: latestWellness.hrvMs != null ? Number(latestWellness.hrvMs) : null,
                hrvStatus: latestWellness.hrvStatus,
                vo2max: latestWellness.vo2max != null ? Number(latestWellness.vo2max) : null,
              }
            : null,
          activeRace: activeRace
            ? { id: activeRace.id, raceName: activeRace.raceName, raceDate: activeRace.raceDate, distance: activeRace.distance, goal: activeRace.goal, targetTimeSec: activeRace.targetTime }
            : null,
        },
      },
    });
  });

  // ── GET /api/v1/public/coach/assessments ───────────────────────────
  app.get<{ Querystring: { from?: string; to?: string; type?: string; limit?: string } }>(
    '/api/v1/public/coach/assessments',
    { onRequest: requireScope('read:coach') },
    async (request, reply) => {
      const conditions = [eq(schema.coachAssessments.userId, request.userId)];
      if (request.query.type) conditions.push(eq(schema.coachAssessments.type, request.query.type));
      if (request.query.from && dateRe.test(request.query.from)) {
        conditions.push(gte(schema.coachAssessments.periodTo, request.query.from));
      }
      if (request.query.to && dateRe.test(request.query.to)) {
        conditions.push(lte(schema.coachAssessments.periodFrom, request.query.to));
      }
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 30));
      const rows = await db.query.coachAssessments.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.coachAssessments.assessedAt)],
        limit,
      });
      return reply.send({ data: rows });
    },
  );

  // ── POST /api/v1/public/coach/assessments ──────────────────────────
  app.post('/api/v1/public/coach/assessments', { onRequest: requireScope('write:coach') }, async (request, reply) => {
    const body = coachAssessmentBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    if (body.data.raceGoalId) {
      const owns = await db.query.raceGoals.findFirst({
        where: and(eq(schema.raceGoals.id, body.data.raceGoalId), eq(schema.raceGoals.userId, request.userId)),
        columns: { id: true },
      });
      if (!owns) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Prova nao encontrada', status: 404 });
    }
    const [row] = await db.insert(schema.coachAssessments).values({
      userId: request.userId,
      raceGoalId: body.data.raceGoalId ?? null,
      type: body.data.type,
      title: body.data.title ?? null,
      summary: body.data.summary,
      data: body.data.data ?? null,
      periodFrom: body.data.periodFrom ?? null,
      periodTo: body.data.periodTo ?? null,
      createdByKeyId: request.apiKeyId ?? null,
    }).returning();
    return reply.code(201).send({ data: row });
  });

  // ── GET /api/v1/public/coach/directives ────────────────────────────
  app.get<{ Querystring: { status?: string } }>(
    '/api/v1/public/coach/directives',
    { onRequest: requireScope('read:coach') },
    async (request, reply) => {
      const conditions = [eq(schema.coachDirectives.userId, request.userId)];
      if (request.query.status) conditions.push(eq(schema.coachDirectives.status, request.query.status));
      const rows = await db.query.coachDirectives.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.coachDirectives.createdAt)],
      });
      return reply.send({ data: rows });
    },
  );

  // ── POST /api/v1/public/coach/directives ───────────────────────────
  app.post('/api/v1/public/coach/directives', { onRequest: requireScope('write:coach') }, async (request, reply) => {
    const body = coachDirectiveBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    // Se substitui uma diretriz, marca a antiga como superseded (valida ownership).
    if (body.data.supersedesId) {
      const prev = await db.query.coachDirectives.findFirst({
        where: and(eq(schema.coachDirectives.id, body.data.supersedesId), eq(schema.coachDirectives.userId, request.userId)),
        columns: { id: true },
      });
      if (!prev) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Diretriz a substituir nao encontrada', status: 404 });
      await db.update(schema.coachDirectives)
        .set({ status: 'superseded', updatedAt: new Date() })
        .where(eq(schema.coachDirectives.id, body.data.supersedesId));
    }
    const [row] = await db.insert(schema.coachDirectives).values({
      userId: request.userId,
      kind: body.data.kind,
      text: body.data.text,
      rationale: body.data.rationale ?? null,
      supersedesId: body.data.supersedesId ?? null,
      expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
      createdByKeyId: request.apiKeyId ?? null,
    }).returning();
    return reply.code(201).send({ data: row });
  });

  // ── PATCH /api/v1/public/coach/directives/:id ──────────────────────
  app.patch<{ Params: { id: string } }>(
    '/api/v1/public/coach/directives/:id',
    { onRequest: requireScope('write:coach') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      const body = coachDirectivePatchBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
      }
      const [updated] = await db.update(schema.coachDirectives)
        .set({ status: body.data.status, updatedAt: new Date() })
        .where(and(eq(schema.coachDirectives.id, params.data.id), eq(schema.coachDirectives.userId, request.userId)))
        .returning();
      if (!updated) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Diretriz nao encontrada', status: 404 });
      return reply.send({ data: updated });
    },
  );

  // ── PUT /api/v1/public/coach/profile ───────────────────────────────
  app.put('/api/v1/public/coach/profile', { onRequest: requireScope('write:coach') }, async (request, reply) => {
    const body = coachProfileBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    const fields: Record<string, unknown> = { updatedByKeyId: request.apiKeyId ?? null, updatedAt: new Date() };
    if (body.data.philosophy !== undefined) fields.philosophy = body.data.philosophy;
    if (body.data.constraints !== undefined) fields.constraints = body.data.constraints;
    if (body.data.currentFocus !== undefined) fields.currentFocus = body.data.currentFocus;
    if (body.data.seasonGoal !== undefined) fields.seasonGoal = body.data.seasonGoal;

    const existing = await db.query.coachProfile.findFirst({ where: eq(schema.coachProfile.userId, request.userId), columns: { id: true } });
    let row;
    if (existing) {
      [row] = await db.update(schema.coachProfile).set(fields).where(eq(schema.coachProfile.userId, request.userId)).returning();
    } else {
      [row] = await db.insert(schema.coachProfile).values({ userId: request.userId, ...fields }).returning();
    }
    return reply.send({ data: row });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONTEXTO PESSOAL / SAÚDE — médico, plano, exames (PHI, scope dedicado)
  // ═══════════════════════════════════════════════════════════════════

  // ── GET /api/v1/public/health/profile ──────────────────────────────
  app.get('/api/v1/public/health/profile', { onRequest: requireScope('read:health') }, async (request, reply) => {
    const profile = await db.query.healthProfile.findFirst({ where: eq(schema.healthProfile.userId, request.userId) });
    return reply.send({ data: profile ?? null });
  });

  // ── PUT /api/v1/public/health/profile ──────────────────────────────
  app.put('/api/v1/public/health/profile', { onRequest: requireScope('write:health') }, async (request, reply) => {
    const body = healthProfileBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    const fields: Record<string, unknown> = { updatedByKeyId: request.apiKeyId ?? null, updatedAt: new Date() };
    if (body.data.providers !== undefined) fields.providers = body.data.providers;
    if (body.data.healthPlan !== undefined) fields.healthPlan = body.data.healthPlan;
    if (body.data.allergies !== undefined) fields.allergies = body.data.allergies;
    if (body.data.medications !== undefined) fields.medications = body.data.medications;
    if (body.data.conditions !== undefined) fields.conditions = body.data.conditions;
    if (body.data.notes !== undefined) fields.notes = body.data.notes;

    const existing = await db.query.healthProfile.findFirst({ where: eq(schema.healthProfile.userId, request.userId), columns: { id: true } });
    let row;
    if (existing) {
      [row] = await db.update(schema.healthProfile).set(fields).where(eq(schema.healthProfile.userId, request.userId)).returning();
    } else {
      [row] = await db.insert(schema.healthProfile).values({ userId: request.userId, ...fields }).returning();
    }
    return reply.send({ data: row });
  });

  // ── GET /api/v1/public/health/exams ────────────────────────────────
  app.get<{ Querystring: { status?: string; type?: string; from?: string; to?: string; limit?: string } }>(
    '/api/v1/public/health/exams',
    { onRequest: requireScope('read:health') },
    async (request, reply) => {
      const conditions = [eq(schema.healthExams.userId, request.userId)];
      if (request.query.status) conditions.push(eq(schema.healthExams.status, request.query.status));
      if (request.query.type) conditions.push(eq(schema.healthExams.examType, request.query.type));
      if (request.query.from && dateRe.test(request.query.from)) conditions.push(gte(schema.healthExams.examDate, request.query.from));
      if (request.query.to && dateRe.test(request.query.to)) conditions.push(lte(schema.healthExams.examDate, request.query.to));
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50));
      const rows = await db.query.healthExams.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.healthExams.examDate), desc(schema.healthExams.createdAt)],
        limit,
      });
      return reply.send({ data: rows });
    },
  );

  // ── POST /api/v1/public/health/exams ───────────────────────────────
  app.post('/api/v1/public/health/exams', { onRequest: requireScope('write:health') }, async (request, reply) => {
    const body = healthExamBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    const [row] = await db.insert(schema.healthExams).values({
      userId: request.userId,
      examType: body.data.examType,
      title: body.data.title ?? null,
      status: body.data.status ?? 'requested',
      provider: body.data.provider ?? null,
      examDate: body.data.examDate ?? null,
      resultDate: body.data.resultDate ?? null,
      items: body.data.items ?? null,
      summary: body.data.summary ?? null,
      data: body.data.data ?? null,
      attachmentRef: body.data.attachmentRef ?? null,
      createdByKeyId: request.apiKeyId ?? null,
    }).returning();
    return reply.code(201).send({ data: row });
  });

  // ── PATCH /api/v1/public/health/exams/:id ──────────────────────────
  app.patch<{ Params: { id: string } }>(
    '/api/v1/public/health/exams/:id',
    { onRequest: requireScope('write:health') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      const body = healthExamPatchBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
      }
      const fields: Record<string, unknown> = { updatedAt: new Date() };
      for (const k of ['status', 'title', 'provider', 'examDate', 'resultDate', 'items', 'summary', 'data', 'attachmentRef'] as const) {
        if (body.data[k] !== undefined) fields[k] = body.data[k];
      }
      const [updated] = await db.update(schema.healthExams)
        .set(fields)
        .where(and(eq(schema.healthExams.id, params.data.id), eq(schema.healthExams.userId, request.userId)))
        .returning();
      if (!updated) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Exame nao encontrado', status: 404 });
      return reply.send({ data: updated });
    },
  );

  // ── GET /api/v1/public/race-projection ─────────────────────────────
  // Expõe a previsão físico-fisiológica do Endura (performance.service) para
  // o Claude ler e refinar (e salvar como coach_assessment type=race_projection).
  app.get('/api/v1/public/race-projection', { onRequest: requireScope('read:profile') }, async (request, reply) => {
    const pmc = await performanceService.calculatePMC(request.userId);
    const target = await performanceService.getTargetRace(request.userId, pmc);
    return reply.send({
      data: {
        pmc: { ctl: pmc.currentCTL, atl: pmc.currentATL, tsb: pmc.currentTSB },
        target,
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ESCRITA DE PLANO (autoritativa) — Claude grava treinos direto
  // ═══════════════════════════════════════════════════════════════════

  // ── POST /api/v1/public/training-plans ─────────────────────────────
  app.post('/api/v1/public/training-plans', { onRequest: requireScope('write:planned') }, async (request, reply) => {
    const body = trainingPlanBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    if (body.data.startDate > body.data.endDate) {
      return reply.code(400).send({ code: 'ERR_INVALID_RANGE', message: 'startDate > endDate', status: 400 });
    }
    if (body.data.raceGoalId) {
      const owns = await db.query.raceGoals.findFirst({
        where: and(eq(schema.raceGoals.id, body.data.raceGoalId), eq(schema.raceGoals.userId, request.userId)),
        columns: { id: true },
      });
      if (!owns) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Prova nao encontrada', status: 404 });
    }
    const [row] = await db.insert(schema.trainingPlans).values({
      userId: request.userId,
      raceGoalId: body.data.raceGoalId ?? null,
      currentPhase: body.data.currentPhase ?? null,
      startDate: body.data.startDate,
      endDate: body.data.endDate,
      totalWeeks: body.data.totalWeeks ?? null,
      status: body.data.status ?? 'active',
    }).returning();
    return reply.code(201).send({ data: row });
  });

  // ── POST /api/v1/public/planned-workouts/bulk ──────────────────────
  app.post('/api/v1/public/planned-workouts/bulk', { onRequest: requireScope('write:planned') }, async (request, reply) => {
    const body = plannedWorkoutsBulkBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
    }
    // Valida ownership de cada planId referenciado.
    const planIds = [...new Set(body.data.workouts.map((w) => w.planId).filter((p): p is string => !!p))];
    for (const planId of planIds) {
      const owns = await db.query.trainingPlans.findFirst({
        where: and(eq(schema.trainingPlans.id, planId), eq(schema.trainingPlans.userId, request.userId)),
        columns: { id: true },
      });
      if (!owns) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: `Plano ${planId} nao encontrado`, status: 404 });
    }
    const values = body.data.workouts.map((w) => ({
      userId: request.userId,
      planId: w.planId ?? null,
      scheduledDate: w.scheduledDate,
      discipline: w.discipline,
      title: w.title ?? null,
      description: w.description ?? null,
      structure: w.structure ?? null,
      durationMin: w.durationMin ?? null,
      distanceM: w.distanceM ?? null,
      intensityZone: w.intensityZone ?? null,
      tssEstimate: numOrNull(w.tssEstimate),
      week: w.week ?? null,
      phase: w.phase ?? null,
    }));
    const rows = await db.insert(schema.plannedWorkouts).values(values).returning();
    return reply.code(201).send({ data: { count: rows.length, items: rows } });
  });

  // ── PUT /api/v1/public/planned-workouts/:id ────────────────────────
  app.put<{ Params: { id: string } }>(
    '/api/v1/public/planned-workouts/:id',
    { onRequest: requireScope('write:planned') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      const body = plannedWorkoutUpdateBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
      }
      const d = body.data;
      const fields: Record<string, unknown> = {};
      if (d.planId !== undefined) fields.planId = d.planId;
      if (d.scheduledDate !== undefined) fields.scheduledDate = d.scheduledDate;
      if (d.discipline !== undefined) fields.discipline = d.discipline;
      if (d.title !== undefined) fields.title = d.title;
      if (d.description !== undefined) fields.description = d.description;
      if (d.structure !== undefined) fields.structure = d.structure;
      if (d.durationMin !== undefined) fields.durationMin = d.durationMin;
      if (d.distanceM !== undefined) fields.distanceM = d.distanceM;
      if (d.intensityZone !== undefined) fields.intensityZone = d.intensityZone;
      if (d.tssEstimate !== undefined) fields.tssEstimate = numOrNull(d.tssEstimate);
      if (d.week !== undefined) fields.week = d.week;
      if (d.phase !== undefined) fields.phase = d.phase;

      const [updated] = await db.update(schema.plannedWorkouts)
        .set(fields)
        .where(and(eq(schema.plannedWorkouts.id, params.data.id), eq(schema.plannedWorkouts.userId, request.userId)))
        .returning();
      if (!updated) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Treino planejado nao encontrado', status: 404 });
      return reply.send({ data: updated });
    },
  );

  // ── DELETE /api/v1/public/planned-workouts/:id ─────────────────────
  app.delete<{ Params: { id: string } }>(
    '/api/v1/public/planned-workouts/:id',
    { onRequest: requireScope('write:planned') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      const [deleted] = await db.delete(schema.plannedWorkouts)
        .where(and(eq(schema.plannedWorkouts.id, params.data.id), eq(schema.plannedWorkouts.userId, request.userId)))
        .returning({ id: schema.plannedWorkouts.id });
      if (!deleted) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Treino planejado nao encontrado', status: 404 });
      return reply.code(204).send();
    },
  );

  // ── POST /api/v1/public/planned-workouts/:id/nutrition-protocol ─────
  // Diferencial Endura: prescreve a suplementação embutida no treino.
  app.post<{ Params: { id: string } }>(
    '/api/v1/public/planned-workouts/:id/nutrition-protocol',
    { onRequest: requireScope('write:planned') },
    async (request, reply) => {
      const params = uuidParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ code: 'ERR_VALIDATION', message: 'ID invalido', status: 400 });
      const body = workoutNutritionBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ code: 'ERR_VALIDATION', message: body.error.errors[0]?.message ?? 'Dados invalidos', status: 400 });
      }
      const workout = await db.query.plannedWorkouts.findFirst({
        where: and(eq(schema.plannedWorkouts.id, params.data.id), eq(schema.plannedWorkouts.userId, request.userId)),
        columns: { id: true },
      });
      if (!workout) return reply.code(404).send({ code: 'ERR_NOT_FOUND', message: 'Treino planejado nao encontrado', status: 404 });

      const protocolFields = {
        items: body.data.items,
        totalCarbsG: numOrNull(body.data.totalCarbsG),
        totalSodiumMg: numOrNull(body.data.totalSodiumMg),
        totalCaffeineMg: numOrNull(body.data.totalCaffeineMg),
        totalKcal: body.data.totalKcal ?? null,
        weatherContext: body.data.weatherContext ?? null,
        status: 'generated' as const,
      };
      const existing = await db.query.nutritionProtocols.findFirst({
        where: eq(schema.nutritionProtocols.plannedWorkoutId, params.data.id),
        columns: { id: true },
      });
      let row;
      if (existing) {
        [row] = await db.update(schema.nutritionProtocols).set(protocolFields).where(eq(schema.nutritionProtocols.id, existing.id)).returning();
      } else {
        [row] = await db.insert(schema.nutritionProtocols).values({ plannedWorkoutId: params.data.id, ...protocolFields }).returning();
      }
      return reply.code(201).send({ data: row });
    },
  );
}

// ── Tratamento de erros do service layer ─────────────────────────

interface AppError { code: string; message: string; status: number }

function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null
    && 'code' in err && 'message' in err && 'status' in err;
}

function handleServiceError(err: unknown, reply: import('fastify').FastifyReply) {
  if (isAppError(err)) {
    return reply.code(err.status).send({ code: err.code, message: err.message, status: err.status });
  }
  reply.log.error(err, 'Erro inesperado em public-api');
  return reply.code(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno', status: 500 });
}
