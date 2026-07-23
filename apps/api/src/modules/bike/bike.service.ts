import { eq, and, ne, desc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import type { CreateBikeBody, UpdateBikeBody } from './bike.schemas.js';

type BikeRow = typeof schema.bikes.$inferSelect;

// ── Setup aero derivado de uma bike (p/ o motor estimateAero) ────

export interface AeroBikeSetup {
  bikeWeightKg: number | null;
  crr: number | null;
  drivetrainEff: number | null;
}

export function bikeToSetup(bike: BikeRow | null | undefined): AeroBikeSetup {
  return {
    bikeWeightKg: bike?.weightKg ? Number(bike.weightKg) : null,
    crr: bike?.crr ? Number(bike.crr) : null,
    drivetrainEff: bike?.drivetrainEfficiency ? Number(bike.drivetrainEfficiency) : null,
  };
}

// ── Consultas ─────────────────────────────────────────────────────

export async function listBikes(userId: string): Promise<BikeRow[]> {
  return db.query.bikes.findMany({
    where: eq(schema.bikes.userId, userId),
    orderBy: [desc(schema.bikes.isDefault), desc(schema.bikes.createdAt)],
  });
}

export async function getDefaultBike(userId: string): Promise<BikeRow | undefined> {
  return db.query.bikes.findFirst({
    where: and(eq(schema.bikes.userId, userId), eq(schema.bikes.isDefault, true)),
  });
}

export async function getBikeById(userId: string, id: string): Promise<BikeRow | undefined> {
  return db.query.bikes.findFirst({
    where: and(eq(schema.bikes.id, id), eq(schema.bikes.userId, userId)),
  });
}

/**
 * Resolve qual bike vale pra uma atividade: a explícita (se pertencer ao
 * usuário), senão a padrão. Usado no sync e no recompute pra alimentar o CdA.
 */
export async function resolveBikeForActivity(
  userId: string,
  explicitBikeId: string | null | undefined,
): Promise<BikeRow | undefined> {
  if (explicitBikeId) {
    const bike = await getBikeById(userId, explicitBikeId);
    if (bike) return bike;
  }
  return getDefaultBike(userId);
}

// ── Mutações ──────────────────────────────────────────────────────

async function unsetDefaults(userId: string, exceptId?: string): Promise<void> {
  const cond = exceptId
    ? and(eq(schema.bikes.userId, userId), eq(schema.bikes.isDefault, true), ne(schema.bikes.id, exceptId))
    : and(eq(schema.bikes.userId, userId), eq(schema.bikes.isDefault, true));
  await db.update(schema.bikes).set({ isDefault: false, updatedAt: new Date() }).where(cond);
}

function notFound(): never {
  throw { code: 'ERR_BIKE_NOT_FOUND', message: 'Bike nao encontrada', status: 404 };
}

async function getOwnedBike(userId: string, id: string): Promise<BikeRow> {
  const bike = await getBikeById(userId, id);
  if (!bike) notFound();
  return bike;
}

export async function createBike(userId: string, data: CreateBikeBody): Promise<BikeRow> {
  const existing = await db.query.bikes.findMany({
    where: eq(schema.bikes.userId, userId),
    columns: { id: true },
  });
  // Primeira bike vira padrão automaticamente; senão respeita o pedido.
  const makeDefault = data.isDefault ?? existing.length === 0;
  if (makeDefault) await unsetDefaults(userId);

  const [bike] = await db
    .insert(schema.bikes)
    .values({
      userId,
      name: data.name,
      weightKg: data.weightKg?.toString() ?? null,
      crr: data.crr?.toString() ?? null,
      drivetrainEfficiency: data.drivetrainEfficiency?.toString() ?? null,
      isDefault: makeDefault,
    })
    .returning();
  return bike!;
}

export async function updateBike(userId: string, id: string, data: UpdateBikeBody): Promise<BikeRow> {
  await getOwnedBike(userId, id);
  if (data.isDefault === true) await unsetDefaults(userId, id);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.weightKg !== undefined) patch.weightKg = data.weightKg?.toString() ?? null;
  if (data.crr !== undefined) patch.crr = data.crr?.toString() ?? null;
  if (data.drivetrainEfficiency !== undefined) patch.drivetrainEfficiency = data.drivetrainEfficiency?.toString() ?? null;
  if (data.isDefault !== undefined) patch.isDefault = data.isDefault;

  const [updated] = await db.update(schema.bikes).set(patch).where(eq(schema.bikes.id, id)).returning();
  return updated!;
}

export async function setDefaultBike(userId: string, id: string): Promise<BikeRow> {
  await getOwnedBike(userId, id);
  await unsetDefaults(userId, id);
  const [updated] = await db
    .update(schema.bikes)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(schema.bikes.id, id))
    .returning();
  return updated!;
}

export async function deleteBike(userId: string, id: string): Promise<{ deleted: true }> {
  const bike = await getOwnedBike(userId, id);
  await db.delete(schema.bikes).where(eq(schema.bikes.id, id));
  // Se era a padrão e sobra alguma, promove a mais recente pra não ficar sem padrão.
  if (bike.isDefault) {
    const next = await db.query.bikes.findFirst({
      where: eq(schema.bikes.userId, userId),
      orderBy: [desc(schema.bikes.createdAt)],
    });
    if (next) {
      await db.update(schema.bikes).set({ isDefault: true, updatedAt: new Date() }).where(eq(schema.bikes.id, next.id));
    }
  }
  return { deleted: true };
}
