import { eq, and, asc, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { generateStructuredJSON, CLAUDE_MODELS } from '../../lib/claude.js';
import { buildGeneratePlanPrompt } from './prompts/generate-plan.prompt.js';
import { buildNutritionProtocolPrompt } from './prompts/nutrition-protocol.prompt.js';

// ── Tipos para resposta do Claude ───────────────────────────────

interface ChatAdaptation {
  workoutId: string | null;
  action: string;
  changes: Record<string, unknown>;
}

interface ChatAdaptResponse {
  response: string;
  adaptations: ChatAdaptation[];
}

interface WorkoutStructure {
  warmup: string;
  main: string;
  cooldown: string;
}

interface GeneratedWorkout {
  scheduledDate: string;
  discipline: string;
  title: string;
  durationMin: number;
  distanceM?: number;
  intensityZone: string;
  structure: WorkoutStructure;
  tssEstimate: number;
}

interface GeneratedWeek {
  weekNumber: number;
  workouts: GeneratedWorkout[];
}

interface GeneratedPhase {
  name: string;
  startWeek: number;
  endWeek: number;
  weeks: GeneratedWeek[];
}

interface GeneratedPlan {
  phases: GeneratedPhase[];
}

interface NutritionItem {
  phase: string;
  minuteOffset: number;
  productName: string;
  brand?: string;
  quantity: number;
  unit: string;
  carbsG: number;
  sodiumMg: number;
  caffeineMg: number;
  kcal: number;
}

interface NutritionProtocolResponse {
  items: NutritionItem[];
  totals: {
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  };
}

// ── generatePlan ────────────────────────────────────────────────

export async function generatePlan(userId: string) {
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

  // 2. Busca prova alvo ativa
  const raceGoal = await db.query.raceGoals.findFirst({
    where: and(
      eq(schema.raceGoals.userId, userId),
      eq(schema.raceGoals.active, true),
    ),
  });

  if (!raceGoal) {
    throw {
      code: 'ERR_RACE_GOAL_NOT_FOUND',
      message: 'Nenhuma prova alvo ativa encontrada. Defina uma prova alvo primeiro.',
      status: 404,
    };
  }

  // 3. Desativa planos anteriores
  await db
    .update(schema.trainingPlans)
    .set({ status: 'archived' })
    .where(and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ));

  // 4. Gera plano via Claude Sonnet
  const { system, prompt } = buildGeneratePlanPrompt(profile, raceGoal);

  const generatedPlan = await generateStructuredJSON<GeneratedPlan>({
    model: CLAUDE_MODELS.SONNET,
    system,
    prompt,
    maxTokens: 16000,
  });

  // 5. Calcula datas do plano
  const today = new Date();
  const nextMonday = getNextMonday(today);
  const allWorkouts = generatedPlan.phases.flatMap((phase) =>
    phase.weeks.flatMap((week) => week.workouts),
  );
  const totalWeeks = generatedPlan.phases.reduce(
    (max, phase) => Math.max(max, phase.endWeek),
    0,
  );

  // Calcula end date baseado na ultima semana
  const endDate = new Date(nextMonday);
  endDate.setDate(endDate.getDate() + totalWeeks * 7 - 1);

  // Determina fase inicial
  const firstPhase = generatedPlan.phases[0];

  // 6. Persiste o plano
  const [plan] = await db
    .insert(schema.trainingPlans)
    .values({
      userId,
      raceGoalId: raceGoal.id,
      currentPhase: firstPhase?.name ?? 'base',
      startDate: formatDate(nextMonday),
      endDate: formatDate(endDate),
      totalWeeks,
      status: 'active',
      generatedAt: new Date(),
    })
    .returning();

  if (!plan) {
    throw {
      code: 'ERR_PLAN_CREATE_FAILED',
      message: 'Falha ao criar o plano de treino',
      status: 500,
    };
  }

  // 7. Persiste treinos planejados
  const workoutInserts = generatedPlan.phases.flatMap((phase) =>
    phase.weeks.flatMap((week) =>
      week.workouts.map((workout) => ({
        planId: plan.id,
        userId,
        scheduledDate: workout.scheduledDate,
        discipline: workout.discipline,
        title: workout.title,
        description: `${workout.structure.warmup} | ${workout.structure.main} | ${workout.structure.cooldown}`,
        structure: workout.structure,
        durationMin: workout.durationMin,
        distanceM: workout.distanceM ?? null,
        intensityZone: workout.intensityZone,
        tssEstimate: workout.tssEstimate.toString(),
        week: week.weekNumber,
        phase: phase.name,
      })),
    ),
  );

  const insertedWorkouts = await db
    .insert(schema.plannedWorkouts)
    .values(workoutInserts)
    .returning();

  // 8. Gera protocolo nutricional para cada treino (Claude Haiku — paralelo limitado)
  const nutritionBatchSize = 5;
  for (let i = 0; i < insertedWorkouts.length; i += nutritionBatchSize) {
    const batch = insertedWorkouts.slice(i, i + nutritionBatchSize);
    await Promise.all(
      batch.map((workout) => generateAndPersistNutrition(workout, profile)),
    );
  }

  // 9. Retorna o plano completo
  return {
    plan,
    totalWorkouts: insertedWorkouts.length,
    phases: generatedPlan.phases.map((phase) => ({
      name: phase.name,
      startWeek: phase.startWeek,
      endWeek: phase.endWeek,
      workoutCount: phase.weeks.reduce((sum, w) => sum + w.workouts.length, 0),
    })),
  };
}

// ── getActivePlan ───────────────────────────────────────────────

export async function getActivePlan(userId: string) {
  const plan = await db.query.trainingPlans.findFirst({
    where: and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ),
  });

  if (!plan) {
    throw {
      code: 'ERR_NO_ACTIVE_PLAN',
      message: 'Nenhum plano de treino ativo encontrado',
      status: 404,
    };
  }

  // Calcula semana atual baseado na data de inicio
  const currentWeek = calculateCurrentWeek(plan.startDate);

  // Busca treinos da semana atual
  const workouts = await db.query.plannedWorkouts.findMany({
    where: and(
      eq(schema.plannedWorkouts.planId, plan.id),
      eq(schema.plannedWorkouts.week, currentWeek),
    ),
    orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
  });

  return {
    plan,
    currentWeek,
    workouts,
  };
}

// ── getCurrentWeekAllWorkouts ───────────────────────────────────
// Retorna todos os treinos planejados da semana atual (Mon-Sun) do usuario,
// incluindo treinos sem plano (ex.: importados do intervals.icu).

function getCurrentWeekBounds(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    startDate: weekStart.toISOString().split('T')[0]!,
    endDate: weekEnd.toISOString().split('T')[0]!,
  };
}

export async function getCurrentWeekAllWorkouts(userId: string) {
  const { startDate, endDate } = getCurrentWeekBounds();

  const workouts = await db.query.plannedWorkouts.findMany({
    where: and(
      eq(schema.plannedWorkouts.userId, userId),
      gte(schema.plannedWorkouts.scheduledDate, startDate),
      lte(schema.plannedWorkouts.scheduledDate, endDate),
    ),
    orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
  });

  // Deriva completed via atividades vinculadas
  const workoutIds = workouts.map((w) => w.id);
  const completedSet = new Set<string>();
  if (workoutIds.length > 0) {
    const linked = await db.query.activities.findMany({
      where: inArray(schema.activities.plannedWorkoutId, workoutIds),
      columns: { plannedWorkoutId: true },
    });
    for (const a of linked) {
      if (a.plannedWorkoutId) completedSet.add(a.plannedWorkoutId);
    }
  }

  // Plano ativo (opcional) para expor weekNumber/phase ao cliente
  const plan = await db.query.trainingPlans.findFirst({
    where: and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ),
  });

  const weekNumber = plan ? calculateCurrentWeek(plan.startDate) : 0;
  const phase = plan?.currentPhase ?? (workouts.length > 0 ? 'Importados' : '');

  return {
    weekNumber,
    phase,
    startDate,
    endDate,
    workouts: workouts.map((w) => ({
      id: w.id,
      discipline: w.discipline,
      title: w.title ?? `Treino ${w.discipline}`,
      scheduledDate: w.scheduledDate,
      durationMin: w.durationMin ?? 0,
      distanceM: w.distanceM,
      completed: completedSet.has(w.id),
      sentToWatch: w.sentToWatch ?? false,
    })),
  };
}

// ── getPlanWeek ─────────────────────────────────────────────────

export async function getPlanWeek(userId: string, weekNumber: number) {
  const plan = await db.query.trainingPlans.findFirst({
    where: and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ),
  });

  if (!plan) {
    throw {
      code: 'ERR_NO_ACTIVE_PLAN',
      message: 'Nenhum plano de treino ativo encontrado',
      status: 404,
    };
  }

  if (plan.totalWeeks && weekNumber > plan.totalWeeks) {
    throw {
      code: 'ERR_INVALID_WEEK',
      message: `Semana ${weekNumber} nao existe no plano (total: ${plan.totalWeeks} semanas)`,
      status: 400,
    };
  }

  const workouts = await db.query.plannedWorkouts.findMany({
    where: and(
      eq(schema.plannedWorkouts.planId, plan.id),
      eq(schema.plannedWorkouts.week, weekNumber),
    ),
    orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
  });

  return {
    weekNumber,
    phase: workouts[0]?.phase ?? null,
    workouts,
  };
}

// ── getWorkout ──────────────────────────────────────────────────

export async function getWorkout(userId: string, workoutId: string) {
  const workout = await db.query.plannedWorkouts.findFirst({
    where: and(
      eq(schema.plannedWorkouts.id, workoutId),
      eq(schema.plannedWorkouts.userId, userId),
    ),
    with: {
      nutritionProtocol: true,
    },
  });

  if (!workout) {
    throw {
      code: 'ERR_WORKOUT_NOT_FOUND',
      message: 'Treino nao encontrado',
      status: 404,
    };
  }

  return workout;
}

// ── chatAdaptPlan ───────────────────────────────────────────────

export async function chatAdaptPlan(userId: string, message: string) {
  // 1. Busca plano ativo e contexto
  const plan = await db.query.trainingPlans.findFirst({
    where: and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ),
  });

  if (!plan) {
    throw {
      code: 'ERR_NO_ACTIVE_PLAN',
      message: 'Nenhum plano de treino ativo encontrado',
      status: 404,
    };
  }

  // Busca perfil do atleta
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  // Calcula semana atual
  const currentWeek = calculateCurrentWeek(plan.startDate);

  // Busca treinos das proximas 2 semanas para contexto
  const upcomingWorkouts = await db.query.plannedWorkouts.findMany({
    where: and(
      eq(schema.plannedWorkouts.planId, plan.id),
    ),
    orderBy: [asc(schema.plannedWorkouts.scheduledDate)],
  });

  const contextWorkouts = upcomingWorkouts.filter(
    (w) => w.week !== null && w.week >= currentWeek && w.week <= currentWeek + 2,
  );

  // 2. Chama Claude para interpretar e adaptar
  const systemPrompt = `Voce e um treinador de triathlon de elite assistindo um atleta via chat.
O atleta tem um plano de treino ativo e quer fazer ajustes ou tirar duvidas.

Contexto do plano:
- Fase atual: ${plan.currentPhase}
- Semana atual: ${currentWeek} de ${plan.totalWeeks}
- Data inicio: ${plan.startDate}
- Data fim: ${plan.endDate}
${profile ? `
Perfil do atleta:
- Nivel: ${profile.level}
- Disciplina mais fraca: ${profile.weakestDiscipline ?? 'N/A'}
- Horas semanais: ${profile.weeklyHours ?? 'N/A'}h
- FC Max: ${profile.maxHr ?? 'N/A'} bpm
- FTP: ${profile.ftpWatts ?? 'N/A'} watts
` : ''}
Treinos proximos:
${contextWorkouts.map((w) => `- ${w.scheduledDate}: ${w.discipline} - ${w.title} (${w.durationMin}min, ${w.intensityZone})`).join('\n')}

Regras:
- Se o atleta pedir para alterar treinos, retorne as alteracoes em JSON.
- Se for uma duvida, responda de forma clara e objetiva.
- Sempre considere o bem-estar e seguranca do atleta.

Retorne SEMPRE um JSON com esta estrutura:
{
  "response": "mensagem de resposta ao atleta",
  "adaptations": [
    {
      "workoutId": "uuid do treino a alterar (ou null para novo)",
      "action": "update|skip|replace",
      "changes": {
        "title": "novo titulo (opcional)",
        "durationMin": number (opcional),
        "intensityZone": "nova zona (opcional)",
        "structure": { "warmup": "...", "main": "...", "cooldown": "..." } (opcional)
      }
    }
  ]
}

Se nao houver adaptacoes (apenas conversa), retorne "adaptations" como array vazio.`;

  const chatResult = await generateStructuredJSON<ChatAdaptResponse>({
    model: CLAUDE_MODELS.SONNET,
    system: systemPrompt,
    prompt: message,
    maxTokens: 4000,
  });

  // 3. Persiste adaptacoes, se houver
  if (chatResult.adaptations.length > 0) {
    for (const adaptation of chatResult.adaptations) {
      if (adaptation.action === 'update' && adaptation.workoutId) {
        const updateData: Record<string, unknown> = {};

        if ('title' in adaptation.changes && typeof adaptation.changes.title === 'string') {
          updateData.title = adaptation.changes.title;
        }
        if ('durationMin' in adaptation.changes && typeof adaptation.changes.durationMin === 'number') {
          updateData.durationMin = adaptation.changes.durationMin;
        }
        if ('intensityZone' in adaptation.changes && typeof adaptation.changes.intensityZone === 'string') {
          updateData.intensityZone = adaptation.changes.intensityZone;
        }
        if ('structure' in adaptation.changes && adaptation.changes.structure) {
          updateData.structure = adaptation.changes.structure;
        }

        if (Object.keys(updateData).length > 0) {
          await db
            .update(schema.plannedWorkouts)
            .set(updateData)
            .where(and(
              eq(schema.plannedWorkouts.id, adaptation.workoutId),
              eq(schema.plannedWorkouts.userId, userId),
            ));
        }
      }

      if (adaptation.action === 'skip' && adaptation.workoutId) {
        // Marca treino como "rest" ao inves de deletar
        await db
          .update(schema.plannedWorkouts)
          .set({
            title: '[Pulado] ' + (contextWorkouts.find((w) => w.id === adaptation.workoutId)?.title ?? ''),
            durationMin: 0,
            intensityZone: 'Z1',
          })
          .where(and(
            eq(schema.plannedWorkouts.id, adaptation.workoutId),
            eq(schema.plannedWorkouts.userId, userId),
          ));
      }
    }

    // Atualiza timestamp de adaptacao no plano
    await db
      .update(schema.trainingPlans)
      .set({ lastAdaptedAt: new Date() })
      .where(eq(schema.trainingPlans.id, plan.id));
  }

  // 4. Retorna resposta e resumo
  return {
    message: chatResult.response,
    adaptationsApplied: chatResult.adaptations.length,
    adaptations: chatResult.adaptations,
  };
}

// ── Helpers internos ────────────────────────────────────────────

/**
 * Gera e persiste o protocolo nutricional de um treino.
 */
async function generateAndPersistNutrition(
  workout: typeof schema.plannedWorkouts.$inferSelect,
  profile: typeof schema.athleteProfiles.$inferSelect,
): Promise<void> {
  try {
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

    const nutritionData = await generateStructuredJSON<NutritionProtocolResponse>({
      model: CLAUDE_MODELS.HAIKU,
      system,
      prompt,
      maxTokens: 2000,
    });

    await db.insert(schema.nutritionProtocols).values({
      plannedWorkoutId: workout.id,
      items: nutritionData.items,
      totalCarbsG: nutritionData.totals.totalCarbsG.toString(),
      totalSodiumMg: nutritionData.totals.totalSodiumMg.toString(),
      totalCaffeineMg: nutritionData.totals.totalCaffeineMg.toString(),
      totalKcal: nutritionData.totals.totalKcal,
    });
  } catch (err) {
    // Log do erro mas nao falha o plano inteiro por um protocolo nutricional
    console.error(
      `Falha ao gerar protocolo nutricional para treino ${workout.id}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Calcula a semana atual baseado na data de inicio do plano.
 */
function calculateCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Retorna a proxima segunda-feira a partir de uma data.
 */
function getNextMonday(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  // 0 = Domingo, 1 = Segunda, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Formata uma data como YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}
