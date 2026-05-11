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
            restingHr: m.restingHr,
            sleepDurationH: m.sleepDurationH != null ? Number(m.sleepDurationH) : null,
            sleepScore: m.sleepScore,
            spo2: m.spo2,
            stressLevel: m.stressLevel,
            bodyBattery: m.bodyBattery,
            weightKg: m.weightKg != null ? Number(m.weightKg) : null,
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
            tss: m.tss != null ? Number(m.tss) : 0,
            ctl: m.ctl != null ? Number(m.ctl) : 0,
            atl: m.atl != null ? Number(m.atl) : 0,
            tsb: m.tsb != null ? Number(m.tsb) : 0,
          })),
        },
      });
    },
  );

  // ── GET /api/v1/public/performance/readiness ───────────────
  app.get('/api/v1/public/performance/readiness', { onRequest: requireScope('read:wellness') }, async (request, reply) => {
    const rows = await db.query.dailyMetrics.findMany({
      where: eq(schema.dailyMetrics.userId, request.userId),
      orderBy: [desc(schema.dailyMetrics.date)],
      limit: 1,
    });

    const latest = rows[0];
    if (!latest) {
      return reply.send({ data: null });
    }

    return reply.send({
      data: {
        date: latest.date,
        readinessScore: latest.readinessScore != null ? Number(latest.readinessScore) : null,
        readinessLevel: latest.readinessLevel,
        fatigueScore: latest.fatigueScore != null ? Number(latest.fatigueScore) : null,
        mentorRecommendation: latest.mentorRecommendation,
        ctl: latest.ctl != null ? Number(latest.ctl) : null,
        atl: latest.atl != null ? Number(latest.atl) : null,
        tsb: latest.tsb != null ? Number(latest.tsb) : null,
        hrvMs: latest.hrvMs != null ? Number(latest.hrvMs) : null,
        restingHr: latest.restingHr,
        sleepScore: latest.sleepScore,
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

    const [nextWorkout, todayActivity, latestWellness, activeRace] = await Promise.all([
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
      db.query.raceGoals.findFirst({
        where: and(
          eq(schema.raceGoals.userId, userId),
          eq(schema.raceGoals.active, true),
        ),
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
              readinessScore: latestWellness.readinessScore != null ? Number(latestWellness.readinessScore) : null,
              readinessLevel: latestWellness.readinessLevel,
              ctl: latestWellness.ctl != null ? Number(latestWellness.ctl) : null,
              atl: latestWellness.atl != null ? Number(latestWellness.atl) : null,
              tsb: latestWellness.tsb != null ? Number(latestWellness.tsb) : null,
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
