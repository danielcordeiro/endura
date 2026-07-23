import { eq, and, desc, gte, sql, count } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import type { ActivityListQuery } from './activity.schemas.js';

// ── Tipos ───────────────────────────────────────────────────────

interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Mapa de periodos para milissegundos ─────────────────────────

const PERIOD_MS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

// ── Listagem paginada de atividades ────────────────────────────

export async function listActivities(
  userId: string,
  filters: ActivityListQuery,
): Promise<PaginatedResult<typeof schema.activities.$inferSelect>> {
  const { type, period, page, limit } = filters;
  const offset = (page - 1) * limit;

  // Monta condições dinâmicas
  const conditions = [eq(schema.activities.userId, userId)];

  if (type) {
    conditions.push(eq(schema.activities.discipline, type));
  }

  if (period) {
    const ms = PERIOD_MS[period];
    if (ms) {
      const since = new Date(Date.now() - ms);
      conditions.push(gte(schema.activities.startedAt, since));
    }
  }

  const whereClause = and(...conditions);

  // Executa count e busca em paralelo para melhor performance
  const [countResult, items] = await Promise.all([
    db
      .select({ total: count() })
      .from(schema.activities)
      .where(whereClause),
    db
      .select()
      .from(schema.activities)
      .where(whereClause)
      .orderBy(desc(schema.activities.startedAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Exclusao de atividade ───────────────────────────────────────

export async function deleteActivity(userId: string, activityId: string): Promise<void> {
  const existing = await db.query.activities.findFirst({
    where: and(
      eq(schema.activities.id, activityId),
      eq(schema.activities.userId, userId),
    ),
    columns: { id: true },
  });

  if (!existing) {
    throw {
      code: 'ERR_ACTIVITY_NOT_FOUND',
      message: 'Atividade nao encontrada',
      status: 404,
    };
  }

  // activity_comments nao tem ON DELETE CASCADE, remover explicitamente.
  // nutrition_logs/items e ai_insights cascateiam pelo schema.
  await db.delete(schema.activityComments).where(eq(schema.activityComments.activityId, activityId));
  await db.delete(schema.activities).where(eq(schema.activities.id, activityId));
}

// ── Update de feedback pos-treino ───────────────────────────────
// perceivedEffort 1-10, notes livre, adverseEvents lista de tags.
// Qualquer campo undefined nao e tocado.

export interface UpdateFeedbackInput {
  perceivedEffort?: number;
  notes?: string;
  adverseEvents?: string[];
}

export async function updateFeedback(
  userId: string,
  activityId: string,
  input: UpdateFeedbackInput,
): Promise<typeof schema.activities.$inferSelect> {
  const existing = await db.query.activities.findFirst({
    where: and(
      eq(schema.activities.id, activityId),
      eq(schema.activities.userId, userId),
    ),
    columns: { id: true },
  });

  if (!existing) {
    throw {
      code: 'ERR_ACTIVITY_NOT_FOUND',
      message: 'Atividade nao encontrada',
      status: 404,
    };
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.perceivedEffort !== undefined) patch.perceivedEffort = input.perceivedEffort;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.adverseEvents !== undefined) patch.adverseEvents = input.adverseEvents;

  const [updated] = await db
    .update(schema.activities)
    .set(patch)
    .where(eq(schema.activities.id, activityId))
    .returning();

  return updated!;
}

// ── Detalhes de uma atividade com nutrition log e items ─────────

export async function getActivity(userId: string, activityId: string) {
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(schema.activities.id, activityId),
      eq(schema.activities.userId, userId),
    ),
    with: {
      nutritionLog: {
        with: {
          items: true,
        },
      },
    },
  });

  if (!activity) {
    throw {
      code: 'ERR_ACTIVITY_NOT_FOUND',
      message: 'Atividade nao encontrada',
      status: 404,
    };
  }

  return activity;
}

// ── Streams pra gráfico (downsample + marcadores de lap) ─────────
// A stream bruta pode ter milhares de pontos (1 por segundo numa atividade
// de horas) — não faz sentido mandar isso pro celular pra desenhar um
// gráfico de ~400px de largura. Faz average-pooling pra no máx `maxPoints`.

const DEFAULT_CHART_MAX_POINTS = 400;

function downsampleAvgPool(values: (number | null)[], bucketSize: number): (number | null)[] {
  if (bucketSize <= 1) return values;
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i += bucketSize) {
    const bucket = values.slice(i, i + bucketSize).filter((v): v is number => v != null);
    out.push(bucket.length > 0 ? Math.round((bucket.reduce((a, b) => a + b, 0) / bucket.length) * 10) / 10 : null);
  }
  return out;
}

export async function getActivityStreamsForChart(
  userId: string,
  activityId: string,
  maxPoints: number = DEFAULT_CHART_MAX_POINTS,
) {
  const activity = await db.query.activities.findFirst({
    where: and(eq(schema.activities.id, activityId), eq(schema.activities.userId, userId)),
    columns: { id: true, hasStreams: true, analysis: true },
  });

  if (!activity) {
    throw { code: 'ERR_ACTIVITY_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 };
  }
  if (!activity.hasStreams) {
    throw { code: 'ERR_NO_STREAMS', message: 'Atividade sem dados de série temporal', status: 404 };
  }

  const streamRow = await db.query.activityStreams.findFirst({
    where: eq(schema.activityStreams.activityId, activityId),
  });
  if (!streamRow) {
    throw { code: 'ERR_NO_STREAMS', message: 'Atividade sem dados de série temporal', status: 404 };
  }

  const timeSec = (streamRow.timeSec as number[]) ?? [];
  const totalSamples = timeSec.length;
  const bucketSize = Math.max(1, Math.ceil(totalSamples / maxPoints));

  const pick = (arr: unknown): (number | null)[] => downsampleAvgPool((arr as (number | null)[] | null) ?? [], bucketSize);
  const timeDownsampled = downsampleAvgPool(timeSec, bucketSize) as number[];

  const laps = ((activity.analysis as { laps?: { lapIndex: number; startOffsetSec: number; name: string | null }[] } | null)?.laps ?? [])
    .map((l) => ({ lapIndex: l.lapIndex, startOffsetSec: l.startOffsetSec, name: l.name }));

  return {
    sampleCount: timeDownsampled.length,
    originalSampleCount: totalSamples,
    timeSec: timeDownsampled,
    watts: pick(streamRow.watts),
    heartRate: pick(streamRow.heartRate),
    cadence: pick(streamRow.cadence),
    altitudeM: pick(streamRow.altitudeM),
    velocityMs: pick(streamRow.velocityMs),
    distanceM: pick(streamRow.distanceM),
    laps,
  };
}
