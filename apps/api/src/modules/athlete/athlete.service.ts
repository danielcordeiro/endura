import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import type { CreateProfileBody, UpdateProfileBody, CreateRaceGoalBody } from './athlete.schemas.js';

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
  // Desativa race goals anteriores
  await db
    .update(schema.raceGoals)
    .set({ active: false })
    .where(and(eq(schema.raceGoals.userId, userId), eq(schema.raceGoals.active, true)));

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
      active: true,
    })
    .returning();

  return goal;
}

export async function getActiveRaceGoal(userId: string) {
  const goal = await db.query.raceGoals.findFirst({
    where: and(eq(schema.raceGoals.userId, userId), eq(schema.raceGoals.active, true)),
  });

  if (!goal) {
    throw {
      code: 'ERR_RACE_GOAL_NOT_FOUND',
      message: 'Nenhuma prova alvo ativa encontrada',
      status: 404,
    };
  }

  return goal;
}
