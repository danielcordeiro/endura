import type { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { authenticateApiKey } from '../api-key/api-key.middleware.js';

// ── Helpers ───────────────────────────────────────────────────────

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

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

  // ── GET /api/v1/public/me ──────────────────────────────────
  app.get('/api/v1/public/me', async (request, reply) => {
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
  app.get('/api/v1/public/performance/readiness', async (request, reply) => {
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
  app.get('/api/v1/public/race-goals', async (request, reply) => {
    const rows = await db.query.raceGoals.findMany({
      where: eq(schema.raceGoals.userId, request.userId),
      orderBy: [asc(schema.raceGoals.raceDate)],
    });
    return reply.send({ data: rows });
  });

  // ── GET /api/v1/public/fitness-tests ───────────────────────
  app.get('/api/v1/public/fitness-tests', async (request, reply) => {
    const rows = await db.query.fitnessTests.findMany({
      where: eq(schema.fitnessTests.userId, request.userId),
      orderBy: [desc(schema.fitnessTests.testDate)],
    });
    return reply.send({ data: rows });
  });

  // ── GET /api/v1/public/summary ─────────────────────────────
  // Snapshot conveniente: proximo treino, atividade de hoje, wellness recente, prova alvo
  app.get('/api/v1/public/summary', async (request, reply) => {
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
}
