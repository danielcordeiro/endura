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
