import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { generateStructuredJSON, CLAUDE_MODELS } from '../../lib/claude.js';
import { buildNutritionProtocolPrompt } from '../plan/prompts/nutrition-protocol.prompt.js';
import type { CustomizeProtocolBody } from './nutrition-planner.schemas.js';
import {
  calculateIntraWorkoutProtocol,
  type IntraWorkoutItem,
  type IntraWorkoutProtocol,
} from './intra-workout-rules.js';

// ── Tipos ─────────────────────────────────────────────────────────

interface ProtocolItem {
  phase: string;
  minuteOffset: number;
  productName: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  carbsG?: number;
  sodiumMg?: number;
  caffeineMg?: number;
  kcal?: number;
}

interface GeneratedProtocol {
  items: ProtocolItem[];
  totals: {
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  };
}

// ── getTodayPlan ──────────────────────────────────────────────────
// Retorna treino + protocolo nutricional do dia

export async function getTodayPlan(userId: string) {
  const today = new Date().toISOString().split('T')[0]!;

  // Busca treino planejado de hoje
  const todayWorkout = await db.query.plannedWorkouts.findFirst({
    where: and(
      eq(schema.plannedWorkouts.userId, userId),
      eq(schema.plannedWorkouts.scheduledDate, today),
    ),
    with: {
      nutritionProtocol: true,
    },
  });

  if (!todayWorkout) {
    return { workout: null, protocol: null };
  }

  return {
    workout: {
      id: todayWorkout.id,
      discipline: todayWorkout.discipline,
      title: todayWorkout.title,
      durationMin: todayWorkout.durationMin,
      distanceM: todayWorkout.distanceM,
      intensityZone: todayWorkout.intensityZone,
      description: todayWorkout.description,
      structure: todayWorkout.structure,
    },
    protocol: todayWorkout.nutritionProtocol ?? null,
  };
}

// ── generateProtocol ──────────────────────────────────────────────
// Gera protocolo nutricional via IA para um treino

export async function generateProtocol(userId: string, workoutId: string) {
  // Busca treino
  const workout = await db.query.plannedWorkouts.findFirst({
    where: and(
      eq(schema.plannedWorkouts.id, workoutId),
      eq(schema.plannedWorkouts.userId, userId),
    ),
  });

  if (!workout) {
    throw {
      code: 'ERR_WORKOUT_NOT_FOUND',
      message: 'Treino nao encontrado ou nao pertence ao usuario',
      status: 404,
    };
  }

  // Busca perfil do atleta
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (!profile) {
    throw {
      code: 'ERR_PROFILE_NOT_FOUND',
      message: 'Perfil atletico nao encontrado. Complete seu perfil primeiro.',
      status: 400,
    };
  }

  // Busca historico de eventos adversos recentes
  const recentActivities = await db.query.activities.findMany({
    where: eq(schema.activities.userId, userId),
    orderBy: [desc(schema.activities.startedAt)],
    limit: 10,
  });

  const adverseHistory = recentActivities
    .filter((a) => a.adverseEvents && a.adverseEvents.length > 0)
    .map((a) => ({
      discipline: a.discipline,
      events: a.adverseEvents,
    }));

  // Enriquece prompt com historico
  const { system, prompt } = buildNutritionProtocolPrompt(
    {
      discipline: workout.discipline,
      title: workout.title,
      durationMin: workout.durationMin,
      distanceM: workout.distanceM,
      intensityZone: workout.intensityZone,
      structure: workout.structure,
    },
    {
      weightKg: profile.weightKg,
      dietaryRestrictions: profile.dietaryRestrictions,
      ownedProducts: profile.ownedProducts,
      giSensitivity: profile.giSensitivity,
      sweatRateHigh: profile.sweatRateHigh,
      crampsHistory: profile.crampsHistory,
    },
  );

  // Adiciona historico de eventos adversos ao prompt
  const enrichedPrompt = adverseHistory.length > 0
    ? `${prompt}\n\n## Historico de Eventos Adversos (ultimas atividades)\n${adverseHistory.map((h) => `- ${h.discipline}: ${h.events?.join(', ')}`).join('\n')}\n\nConsidere este historico ao recomendar produtos e quantidades.`
    : prompt;

  const result = await generateStructuredJSON<GeneratedProtocol>({
    model: CLAUDE_MODELS.HAIKU,
    system,
    prompt: enrichedPrompt,
    maxTokens: 2000,
  });

  // Verifica se ja existe protocolo para esse treino
  const existing = await db.query.nutritionProtocols.findFirst({
    where: eq(schema.nutritionProtocols.plannedWorkoutId, workoutId),
  });

  if (existing) {
    // Atualiza protocolo existente
    const [updated] = await db
      .update(schema.nutritionProtocols)
      .set({
        items: result.items,
        totalCarbsG: result.totals.totalCarbsG.toFixed(2),
        totalSodiumMg: result.totals.totalSodiumMg.toFixed(2),
        totalCaffeineMg: result.totals.totalCaffeineMg.toFixed(2),
        totalKcal: Math.round(result.totals.totalKcal),
        status: 'generated',
        acceptedAt: null,
      })
      .where(eq(schema.nutritionProtocols.id, existing.id))
      .returning();

    return updated!;
  }

  // Cria novo protocolo
  const [protocol] = await db
    .insert(schema.nutritionProtocols)
    .values({
      plannedWorkoutId: workoutId,
      items: result.items,
      totalCarbsG: result.totals.totalCarbsG.toFixed(2),
      totalSodiumMg: result.totals.totalSodiumMg.toFixed(2),
      totalCaffeineMg: result.totals.totalCaffeineMg.toFixed(2),
      totalKcal: Math.round(result.totals.totalKcal),
      status: 'generated',
    })
    .returning();

  return protocol!;
}

// ── getIntraWorkoutSuggestion ─────────────────────────────────────
// Calcula sugestao via regras deterministicas sem persistir.
// Retorna tambem o protocolo existente (se ja aceito) para a UI decidir.

export async function getIntraWorkoutSuggestion(userId: string, workoutId: string): Promise<{
  suggestion: IntraWorkoutProtocol;
  existingProtocol: typeof schema.nutritionProtocols.$inferSelect | null;
}> {
  const workout = await db.query.plannedWorkouts.findFirst({
    where: and(
      eq(schema.plannedWorkouts.id, workoutId),
      eq(schema.plannedWorkouts.userId, userId),
    ),
  });

  if (!workout) {
    throw { code: 'ERR_WORKOUT_NOT_FOUND', message: 'Treino nao encontrado', status: 404 };
  }

  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  const suggestion = calculateIntraWorkoutProtocol({
    durationMin: workout.durationMin,
    discipline: workout.discipline,
    intensityZone: workout.intensityZone,
    weightKg: profile?.weightKg ? Number(profile.weightKg) : null,
    sweatRateHigh: profile?.sweatRateHigh ?? null,
    giSensitivity: profile?.giSensitivity ?? null,
    hotWeather: null, // reservado para integracao futura com clima
  });

  const existingProtocol = await db.query.nutritionProtocols.findFirst({
    where: eq(schema.nutritionProtocols.plannedWorkoutId, workoutId),
  });

  return { suggestion, existingProtocol: existingProtocol ?? null };
}

// ── acceptDefaultSuggestion ───────────────────────────────────────
// Persiste a sugestao (ou uma customizacao) como protocolo aceito.

export async function acceptDefaultSuggestion(
  userId: string,
  workoutId: string,
  customItems?: IntraWorkoutItem[],
): Promise<typeof schema.nutritionProtocols.$inferSelect> {
  const { suggestion, existingProtocol } = await getIntraWorkoutSuggestion(userId, workoutId);

  // Se ja existe protocolo aceito, retorna idempotente
  if (existingProtocol && existingProtocol.status === 'accepted') {
    return existingProtocol;
  }

  const items = customItems && customItems.length > 0 ? customItems : suggestion.items;
  const totals = items.reduce(
    (acc, item) => {
      acc.totalCarbsG += item.carbsG * item.quantity;
      acc.totalSodiumMg += item.sodiumMg * item.quantity;
      acc.totalCaffeineMg += (item.caffeineMg ?? 0) * item.quantity;
      acc.totalKcal += item.kcal * item.quantity;
      return acc;
    },
    { totalCarbsG: 0, totalSodiumMg: 0, totalCaffeineMg: 0, totalKcal: 0 },
  );

  if (existingProtocol) {
    const [updated] = await db.update(schema.nutritionProtocols)
      .set({
        items,
        totalCarbsG: totals.totalCarbsG.toFixed(2),
        totalSodiumMg: totals.totalSodiumMg.toFixed(2),
        totalCaffeineMg: totals.totalCaffeineMg.toFixed(2),
        totalKcal: Math.round(totals.totalKcal),
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(schema.nutritionProtocols.id, existingProtocol.id))
      .returning();
    return updated!;
  }

  const [created] = await db.insert(schema.nutritionProtocols).values({
    plannedWorkoutId: workoutId,
    items,
    totalCarbsG: totals.totalCarbsG.toFixed(2),
    totalSodiumMg: totals.totalSodiumMg.toFixed(2),
    totalCaffeineMg: totals.totalCaffeineMg.toFixed(2),
    totalKcal: Math.round(totals.totalKcal),
    status: 'accepted',
    acceptedAt: new Date(),
  }).returning();

  return created!;
}

// ── acceptProtocol ────────────────────────────────────────────────
// Marca protocolo como aceito

export async function acceptProtocol(userId: string, protocolId: string) {
  // Valida que o protocolo pertence ao usuario
  const protocol = await db.query.nutritionProtocols.findFirst({
    where: eq(schema.nutritionProtocols.id, protocolId),
    with: {
      plannedWorkout: true,
    },
  });

  if (!protocol || protocol.plannedWorkout.userId !== userId) {
    throw {
      code: 'ERR_PROTOCOL_NOT_FOUND',
      message: 'Protocolo nao encontrado',
      status: 404,
    };
  }

  const [updated] = await db
    .update(schema.nutritionProtocols)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
    })
    .where(eq(schema.nutritionProtocols.id, protocolId))
    .returning();

  return updated!;
}

// ── applyPreset ───────────────────────────────────────────────────
// Aplica um preset do usuario como protocolo de um treino

export async function applyPreset(userId: string, workoutId: string) {
  // Busca treino
  const workout = await db.query.plannedWorkouts.findFirst({
    where: and(
      eq(schema.plannedWorkouts.id, workoutId),
      eq(schema.plannedWorkouts.userId, userId),
    ),
  });

  if (!workout) {
    throw {
      code: 'ERR_WORKOUT_NOT_FOUND',
      message: 'Treino nao encontrado',
      status: 404,
    };
  }

  // Busca presets do usuario (pega o primeiro — UI permitira escolher)
  const presets = await db.query.supplementPresets.findMany({
    where: eq(schema.supplementPresets.userId, userId),
    limit: 1,
  });

  if (presets.length === 0) {
    throw {
      code: 'ERR_NO_PRESETS',
      message: 'Nenhum preset de suplementacao encontrado. Crie um preset primeiro.',
      status: 400,
    };
  }

  const preset = presets[0]!;
  const presetItems = preset.items as ProtocolItem[];

  // Calcula totais
  let totalCarbsG = 0;
  let totalSodiumMg = 0;
  let totalCaffeineMg = 0;
  let totalKcal = 0;

  for (const item of presetItems) {
    totalCarbsG += Number(item.carbsG ?? 0);
    totalSodiumMg += Number(item.sodiumMg ?? 0);
    totalCaffeineMg += Number(item.caffeineMg ?? 0);
    totalKcal += Number(item.kcal ?? 0);
  }

  // Verifica se ja existe protocolo
  const existing = await db.query.nutritionProtocols.findFirst({
    where: eq(schema.nutritionProtocols.plannedWorkoutId, workoutId),
  });

  if (existing) {
    const [updated] = await db
      .update(schema.nutritionProtocols)
      .set({
        items: presetItems,
        totalCarbsG: totalCarbsG.toFixed(2),
        totalSodiumMg: totalSodiumMg.toFixed(2),
        totalCaffeineMg: totalCaffeineMg.toFixed(2),
        totalKcal: Math.round(totalKcal),
        status: 'customized',
        acceptedAt: new Date(),
      })
      .where(eq(schema.nutritionProtocols.id, existing.id))
      .returning();

    return updated!;
  }

  const [protocol] = await db
    .insert(schema.nutritionProtocols)
    .values({
      plannedWorkoutId: workoutId,
      items: presetItems,
      totalCarbsG: totalCarbsG.toFixed(2),
      totalSodiumMg: totalSodiumMg.toFixed(2),
      totalCaffeineMg: totalCaffeineMg.toFixed(2),
      totalKcal: Math.round(totalKcal),
      status: 'customized',
      acceptedAt: new Date(),
    })
    .returning();

  return protocol!;
}

// ── customizeProtocol ─────────────────────────────────────────────
// Edita itens de um protocolo existente

export async function customizeProtocol(
  userId: string,
  protocolId: string,
  data: CustomizeProtocolBody,
) {
  const protocol = await db.query.nutritionProtocols.findFirst({
    where: eq(schema.nutritionProtocols.id, protocolId),
    with: {
      plannedWorkout: true,
    },
  });

  if (!protocol || protocol.plannedWorkout.userId !== userId) {
    throw {
      code: 'ERR_PROTOCOL_NOT_FOUND',
      message: 'Protocolo nao encontrado',
      status: 404,
    };
  }

  // Calcula totais
  let totalCarbsG = 0;
  let totalSodiumMg = 0;
  let totalCaffeineMg = 0;
  let totalKcal = 0;

  for (const item of data.items) {
    totalCarbsG += Number(item.carbsG ?? 0);
    totalSodiumMg += Number(item.sodiumMg ?? 0);
    totalCaffeineMg += Number(item.caffeineMg ?? 0);
    totalKcal += Number(item.kcal ?? 0);
  }

  const [updated] = await db
    .update(schema.nutritionProtocols)
    .set({
      items: data.items,
      totalCarbsG: totalCarbsG.toFixed(2),
      totalSodiumMg: totalSodiumMg.toFixed(2),
      totalCaffeineMg: totalCaffeineMg.toFixed(2),
      totalKcal: Math.round(totalKcal),
      status: 'customized',
      acceptedAt: new Date(),
    })
    .where(eq(schema.nutritionProtocols.id, protocolId))
    .returning();

  return updated!;
}
