import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { generateStructuredJSON, CLAUDE_MODELS } from '../../lib/claude.js';
import { buildRaceSimulationPrompt } from './prompts/race-simulation.prompt.js';
import type { SimulateBody, UpdatePlanBody } from './race-nutrition.schemas.js';

// ── Tipos para resposta do Claude ───────────────────────────────

interface PhaseItem {
  minuteOffset: number;
  productName: string;
  brand?: string;
  quantity: number;
  unit: string;
  carbsG: number;
  sodiumMg: number;
  caffeineMg: number;
  kcal: number;
  notes?: string;
}

interface Phase {
  discipline: string;
  durationMin: number;
  items: PhaseItem[];
}

interface RaceNutritionPlanResponse {
  phases: Phase[];
  totals: {
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  };
  notes: string[];
  riskFactors: string[];
}

// ── simulate ─────────────────────────────────────────────────────
// Gera um plano nutricional para race day via Claude Sonnet

export async function simulate(userId: string, data: SimulateBody) {
  // 1. Busca perfil do atleta
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (!profile) {
    throw {
      code: 'ERR_PROFILE_NOT_FOUND',
      message: 'Perfil atletico nao encontrado. Complete o onboarding primeiro.',
      status: 404,
    };
  }

  // 2. Busca race goal se fornecido, senao busca o ativo
  let raceGoal = null;

  if (data.raceGoalId) {
    raceGoal = await db.query.raceGoals.findFirst({
      where: and(
        eq(schema.raceGoals.id, data.raceGoalId),
        eq(schema.raceGoals.userId, userId),
      ),
    });

    if (!raceGoal) {
      throw {
        code: 'ERR_RACE_GOAL_NOT_FOUND',
        message: 'Prova alvo nao encontrada',
        status: 404,
      };
    }
  }

  // Determina distancia: do body, do raceGoal, ou erro
  const distance = data.distance ?? raceGoal?.distance;
  if (!distance) {
    throw {
      code: 'ERR_DISTANCE_REQUIRED',
      message: 'Distancia da prova e obrigatoria. Informe no body ou vincule a uma prova alvo.',
      status: 400,
    };
  }

  // 3. Busca historico nutricional recente (ultimas 10 atividades)
  const recentActivities = await db.query.activities.findMany({
    where: eq(schema.activities.userId, userId),
    orderBy: [desc(schema.activities.startedAt)],
    limit: 10,
    with: {
      nutritionLog: true,
    },
  });

  const nutritionHistory = recentActivities
    .filter((a) => a.nutritionLog)
    .map((a) => ({
      discipline: a.discipline,
      carbsPerHour: a.nutritionLog?.carbsPerHour ?? null,
      sodiumPerHour: a.nutritionLog?.sodiumPerHour ?? null,
      adverseEvents: a.adverseEvents,
    }));

  // 4. Monta prompt e chama Claude Sonnet
  const { system, prompt } = buildRaceSimulationPrompt({
    name: data.name,
    distance,
    targetTimeSec: data.targetTimeSec,
    weatherConditions: data.weatherConditions,
    athleteProfile: {
      weightKg: profile.weightKg,
      dietaryRestrictions: profile.dietaryRestrictions,
      ownedProducts: profile.ownedProducts,
      giSensitivity: profile.giSensitivity,
      sweatRateHigh: profile.sweatRateHigh,
      crampsHistory: profile.crampsHistory,
    },
    raceGoal: raceGoal
      ? {
          distance: raceGoal.distance,
          targetTime: raceGoal.targetTime,
          raceName: raceGoal.raceName,
        }
      : null,
    nutritionHistory,
  });

  const result = await generateStructuredJSON<RaceNutritionPlanResponse>({
    model: CLAUDE_MODELS.SONNET,
    system,
    prompt,
    maxTokens: 8000,
  });

  // 5. Persiste no banco
  const [plan] = await db
    .insert(schema.raceNutritionPlans)
    .values({
      userId,
      raceGoalId: data.raceGoalId ?? raceGoal?.id ?? null,
      name: data.name,
      targetTimeSec: data.targetTimeSec ?? raceGoal?.targetTime ?? null,
      weatherConditions: data.weatherConditions ?? null,
      plan: { phases: result.phases, notes: result.notes, riskFactors: result.riskFactors },
      totals: result.totals,
      status: 'draft',
    })
    .returning();

  return plan!;
}

// ── listPlans ────────────────────────────────────────────────────
// Retorna todos os planos de nutricao race day do usuario

export async function listPlans(userId: string) {
  const plans = await db.query.raceNutritionPlans.findMany({
    where: eq(schema.raceNutritionPlans.userId, userId),
    orderBy: [desc(schema.raceNutritionPlans.createdAt)],
  });

  return plans;
}

// ── getPlan ──────────────────────────────────────────────────────
// Retorna um plano especifico do usuario

export async function getPlan(userId: string, planId: string) {
  const plan = await db.query.raceNutritionPlans.findFirst({
    where: and(
      eq(schema.raceNutritionPlans.id, planId),
      eq(schema.raceNutritionPlans.userId, userId),
    ),
  });

  if (!plan) {
    throw {
      code: 'ERR_PLAN_NOT_FOUND',
      message: 'Plano de nutricao race day nao encontrado',
      status: 404,
    };
  }

  return plan;
}

// ── updatePlan ───────────────────────────────────────────────────
// Atualiza nome, status ou conteudo de um plano

export async function updatePlan(userId: string, planId: string, data: UpdatePlanBody) {
  // Verifica que o plano pertence ao usuario
  const existing = await db.query.raceNutritionPlans.findFirst({
    where: and(
      eq(schema.raceNutritionPlans.id, planId),
      eq(schema.raceNutritionPlans.userId, userId),
    ),
  });

  if (!existing) {
    throw {
      code: 'ERR_PLAN_NOT_FOUND',
      message: 'Plano de nutricao race day nao encontrado',
      status: 404,
    };
  }

  // Monta objeto de atualizacao
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.plan !== undefined) updateData.plan = data.plan;

  const [updated] = await db
    .update(schema.raceNutritionPlans)
    .set(updateData)
    .where(eq(schema.raceNutritionPlans.id, planId))
    .returning();

  return updated!;
}

// ── deletePlan ───────────────────────────────────────────────────
// Remove um plano de nutricao race day

export async function deletePlan(userId: string, planId: string) {
  const existing = await db.query.raceNutritionPlans.findFirst({
    where: and(
      eq(schema.raceNutritionPlans.id, planId),
      eq(schema.raceNutritionPlans.userId, userId),
    ),
  });

  if (!existing) {
    throw {
      code: 'ERR_PLAN_NOT_FOUND',
      message: 'Plano de nutricao race day nao encontrado',
      status: 404,
    };
  }

  await db
    .delete(schema.raceNutritionPlans)
    .where(eq(schema.raceNutritionPlans.id, planId));
}

// ── markTested ───────────────────────────────────────────────────
// Vincula uma atividade ao plano e marca como testado

export async function markTested(userId: string, planId: string, activityId: string) {
  // Verifica que o plano pertence ao usuario
  const plan = await db.query.raceNutritionPlans.findFirst({
    where: and(
      eq(schema.raceNutritionPlans.id, planId),
      eq(schema.raceNutritionPlans.userId, userId),
    ),
  });

  if (!plan) {
    throw {
      code: 'ERR_PLAN_NOT_FOUND',
      message: 'Plano de nutricao race day nao encontrado',
      status: 404,
    };
  }

  // Verifica que a atividade pertence ao usuario
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(schema.activities.id, activityId),
      eq(schema.activities.userId, userId),
    ),
  });

  if (!activity) {
    throw {
      code: 'ERR_ACTIVITY_NOT_FOUND',
      message: 'Atividade nao encontrada ou nao pertence ao usuario',
      status: 404,
    };
  }

  // Adiciona activityId ao array testedInWorkouts (evita duplicatas)
  const currentTested = plan.testedInWorkouts ?? [];
  const alreadyTested = currentTested.includes(activityId);

  const updatedTested = alreadyTested
    ? currentTested
    : [...currentTested, activityId];

  const [updated] = await db
    .update(schema.raceNutritionPlans)
    .set({
      testedInWorkouts: updatedTested,
      status: 'tested',
      updatedAt: new Date(),
    })
    .where(eq(schema.raceNutritionPlans.id, planId))
    .returning();

  return updated!;
}
