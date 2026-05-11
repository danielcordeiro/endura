import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';

export interface DailyCheckinInput {
  date: string; // YYYY-MM-DD
  feeling: number;
  muscleSoreness: number;
  injuryNote?: string | null;
}

/**
 * Upsert de check-in diario do atleta. Nao recalcula readiness — o Mentor IA
 * interno faz isso em outro fluxo (performance.routes). Aqui guardamos apenas
 * o input subjetivo, que pode ser registrado por um agente externo.
 */
export async function upsertDailyCheckin(
  userId: string,
  input: DailyCheckinInput,
): Promise<typeof schema.dailyCheckins.$inferSelect> {
  const existing = await db.query.dailyCheckins.findFirst({
    where: and(
      eq(schema.dailyCheckins.userId, userId),
      eq(schema.dailyCheckins.date, input.date),
    ),
  });

  const payload = {
    feeling: input.feeling,
    muscleSoreness: input.muscleSoreness,
    injuryNote: input.injuryNote ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(schema.dailyCheckins)
      .set(payload)
      .where(eq(schema.dailyCheckins.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(schema.dailyCheckins)
    .values({ userId, date: input.date, ...payload })
    .returning();
  return created!;
}

export async function listDailyCheckins(userId: string, from: string, to: string) {
  return db.query.dailyCheckins.findMany({
    where: and(
      eq(schema.dailyCheckins.userId, userId),
      gte(schema.dailyCheckins.date, from),
      lte(schema.dailyCheckins.date, to),
    ),
    orderBy: [asc(schema.dailyCheckins.date)],
  });
}
