import { eq, and, asc, gte } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import type { CreateProfileBody, UpdateProfileBody, CreateRaceGoalBody, UpdateRaceGoalBody } from './athlete.schemas.js';

// ── Profile ──────────────────────────────────────────────────────

export async function createProfile(userId: string, data: CreateProfileBody) {
  const existing = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (existing) {
    const [updated] = await db
      .update(schema.athleteProfiles)
      .set({
        ...data,
        weeklyHours: data.weeklyHours?.toString() ?? existing.weeklyHours,
        weightKg: data.weightKg?.toString() ?? existing.weightKg,
        updatedAt: new Date(),
      })
      .where(eq(schema.athleteProfiles.userId, userId))
      .returning();

    return updated;
  }

  const [profile] = await db
    .insert(schema.athleteProfiles)
    .values({
      userId,
      level: data.level,
      weakestDiscipline: data.weakestDiscipline ?? null,
      weeklyHours: data.weeklyHours?.toString() ?? null,
      availableDays: data.availableDays ?? null,
      hasPool: data.hasPool,
      hasBikeTrainer: data.hasBikeTrainer,
      hasTreadmill: data.hasTreadmill,
      weightKg: data.weightKg?.toString() ?? null,
      heightCm: data.heightCm ?? null,
      maxHr: data.maxHr ?? null,
      ftpWatts: data.ftpWatts ?? null,
      run5kPaceSec: data.run5kPaceSec ?? null,
      dietaryRestrictions: data.dietaryRestrictions ?? null,
      ownedProducts: data.ownedProducts ?? null,
      giSensitivity: data.giSensitivity,
      sweatRateHigh: data.sweatRateHigh,
      crampsHistory: data.crampsHistory,
    })
    .returning();

  return profile;
}

export async function getProfile(userId: string) {
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (!profile) {
    throw {
      code: 'ERR_PROFILE_NOT_FOUND',
      message: 'Perfil atletico nao encontrado',
      status: 404,
    };
  }

  return profile;
}

export async function updateProfile(userId: string, data: UpdateProfileBody) {
  const existing = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (!existing) {
    throw {
      code: 'ERR_PROFILE_NOT_FOUND',
      message: 'Perfil atletico nao encontrado. Crie um perfil primeiro.',
      status: 404,
    };
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.level !== undefined) updateData.level = data.level;
  if (data.weakestDiscipline !== undefined) updateData.weakestDiscipline = data.weakestDiscipline;
  if (data.weeklyHours !== undefined) updateData.weeklyHours = data.weeklyHours?.toString() ?? null;
  if (data.availableDays !== undefined) updateData.availableDays = data.availableDays;
  if (data.hasPool !== undefined) updateData.hasPool = data.hasPool;
  if (data.hasBikeTrainer !== undefined) updateData.hasBikeTrainer = data.hasBikeTrainer;
  if (data.hasTreadmill !== undefined) updateData.hasTreadmill = data.hasTreadmill;
  if (data.weightKg !== undefined) updateData.weightKg = data.weightKg?.toString() ?? null;
  if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
  if (data.maxHr !== undefined) updateData.maxHr = data.maxHr;
  if (data.ftpWatts !== undefined) updateData.ftpWatts = data.ftpWatts;
  if (data.run5kPaceSec !== undefined) updateData.run5kPaceSec = data.run5kPaceSec;
  if (data.dietaryRestrictions !== undefined) updateData.dietaryRestrictions = data.dietaryRestrictions;
  if (data.ownedProducts !== undefined) updateData.ownedProducts = data.ownedProducts;
  if (data.giSensitivity !== undefined) updateData.giSensitivity = data.giSensitivity;
  if (data.sweatRateHigh !== undefined) updateData.sweatRateHigh = data.sweatRateHigh;
  if (data.crampsHistory !== undefined) updateData.crampsHistory = data.crampsHistory;

  const [updated] = await db
    .update(schema.athleteProfiles)
    .set(updateData)
    .where(eq(schema.athleteProfiles.userId, userId))
    .returning();

  return updated;
}

// ── Race Goal ────────────────────────────────────────────────────

export async function createRaceGoal(userId: string, data: CreateRaceGoalBody) {
  const priority = data.priority ?? 'A';

  // Só pode existir UMA prova A ativa (a prova alvo principal). Ao criar uma nova
  // prova A, as provas A ativas anteriores são rebaixadas para B (viram parte do
  // calendário, sem sumir). Provas B/C coexistem livremente.
  if (priority === 'A') {
    await db
      .update(schema.raceGoals)
      .set({ priority: 'B' })
      .where(
        and(
          eq(schema.raceGoals.userId, userId),
          eq(schema.raceGoals.active, true),
          eq(schema.raceGoals.priority, 'A'),
        ),
      );
  }

  const [goal] = await db
    .insert(schema.raceGoals)
    .values({
      userId,
      distance: data.distance,
      raceDate: data.raceDate,
      goal: data.goal,
      targetTime: data.targetTime ?? null,
      raceName: data.raceName ?? null,
      bikeElevationGainM: data.bikeElevationGainM ? String(data.bikeElevationGainM) : null,
      runElevationGainM: data.runElevationGainM ? String(data.runElevationGainM) : null,
      priority,
      location: data.location ?? null,
      notes: data.notes ?? null,
      active: true,
    })
    .returning();

  return goal;
}

// Calendário completo: todas as provas (ativas e arquivadas), ordenadas por data.
export async function listRaceGoals(userId: string, opts: { includeArchived?: boolean } = {}) {
  const where = opts.includeArchived
    ? eq(schema.raceGoals.userId, userId)
    : and(eq(schema.raceGoals.userId, userId), eq(schema.raceGoals.active, true));

  return db.query.raceGoals.findMany({
    where,
    orderBy: [asc(schema.raceGoals.raceDate)],
  });
}

// Prova alvo principal: a prova A ativa mais próxima no futuro. Fallback: qualquer
// prova A ativa; depois, a prova ativa mais próxima no futuro (compat. retroativa).
export async function getActiveRaceGoal(userId: string) {
  const today = new Date().toISOString().split('T')[0]!;

  const goal =
    (await db.query.raceGoals.findFirst({
      where: and(
        eq(schema.raceGoals.userId, userId),
        eq(schema.raceGoals.active, true),
        eq(schema.raceGoals.priority, 'A'),
        gte(schema.raceGoals.raceDate, today),
      ),
      orderBy: [asc(schema.raceGoals.raceDate)],
    })) ??
    (await db.query.raceGoals.findFirst({
      where: and(
        eq(schema.raceGoals.userId, userId),
        eq(schema.raceGoals.active, true),
        eq(schema.raceGoals.priority, 'A'),
      ),
      orderBy: [asc(schema.raceGoals.raceDate)],
    })) ??
    (await db.query.raceGoals.findFirst({
      where: and(
        eq(schema.raceGoals.userId, userId),
        eq(schema.raceGoals.active, true),
        gte(schema.raceGoals.raceDate, today),
      ),
      orderBy: [asc(schema.raceGoals.raceDate)],
    }));

  if (!goal) {
    throw {
      code: 'ERR_RACE_GOAL_NOT_FOUND',
      message: 'Nenhuma prova alvo ativa encontrada',
      status: 404,
    };
  }

  return goal;
}

async function getOwnedRaceGoal(userId: string, id: string) {
  const goal = await db.query.raceGoals.findFirst({
    where: and(eq(schema.raceGoals.id, id), eq(schema.raceGoals.userId, userId)),
  });
  if (!goal) {
    throw { code: 'ERR_RACE_GOAL_NOT_FOUND', message: 'Prova não encontrada', status: 404 };
  }
  return goal;
}

export async function updateRaceGoal(userId: string, id: string, data: UpdateRaceGoalBody) {
  await getOwnedRaceGoal(userId, id);

  // Promovendo esta prova para A → rebaixa as outras A ativas para B.
  if (data.priority === 'A') {
    await db
      .update(schema.raceGoals)
      .set({ priority: 'B' })
      .where(
        and(
          eq(schema.raceGoals.userId, userId),
          eq(schema.raceGoals.active, true),
          eq(schema.raceGoals.priority, 'A'),
        ),
      );
  }

  const patch: Record<string, unknown> = {};
  if (data.distance !== undefined) patch.distance = data.distance;
  if (data.raceDate !== undefined) patch.raceDate = data.raceDate;
  if (data.goal !== undefined) patch.goal = data.goal;
  if (data.targetTime !== undefined) patch.targetTime = data.targetTime;
  if (data.raceName !== undefined) patch.raceName = data.raceName;
  if (data.bikeElevationGainM !== undefined)
    patch.bikeElevationGainM = data.bikeElevationGainM != null ? String(data.bikeElevationGainM) : null;
  if (data.runElevationGainM !== undefined)
    patch.runElevationGainM = data.runElevationGainM != null ? String(data.runElevationGainM) : null;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.location !== undefined) patch.location = data.location;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.active !== undefined) patch.active = data.active;

  const [updated] = await db
    .update(schema.raceGoals)
    .set(patch)
    .where(and(eq(schema.raceGoals.id, id), eq(schema.raceGoals.userId, userId)))
    .returning();

  return updated;
}

export async function deleteRaceGoal(userId: string, id: string) {
  await getOwnedRaceGoal(userId, id);
  await db
    .delete(schema.raceGoals)
    .where(and(eq(schema.raceGoals.id, id), eq(schema.raceGoals.userId, userId)));
  return { deleted: true };
}
