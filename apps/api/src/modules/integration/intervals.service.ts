import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { decrypt } from '../../lib/encryption.js';

// ── Constantes ──────────────────────────────────────────────────

const PROVIDER = 'intervals_icu';
const INTERVALS_API_BASE = 'https://intervals.icu/api/v1';

// ── Tipos para a estrutura do treino planejado ──────────────────

interface WorkoutStep {
  type?: string;
  name?: string;
  duration?: number;
  durationUnit?: string;
  intensity?: string;
  powerTarget?: number;
  hrTarget?: number;
  cadenceTarget?: number;
  notes?: string;
}

interface WorkoutStructure {
  warmup?: WorkoutStep[];
  main?: WorkoutStep[];
  cooldown?: WorkoutStep[];
  steps?: WorkoutStep[];
}

// ── Tipo para resposta da API intervals.icu ─────────────────────

interface IntervalsWorkoutResponse {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

// ── Mapeamento de disciplina para tipo intervals.icu ────────────

const DISCIPLINE_TO_INTERVALS_TYPE: Record<string, string> = {
  run: 'Run',
  bike: 'Ride',
  swim: 'Swim',
  other: 'Other',
};

// ── Conversao de estrutura do treino para formato intervals.icu ─

function convertStepToIntervals(
  step: WorkoutStep,
  discipline: string,
): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  if (step.name) converted.name = step.name;
  if (step.notes) converted.notes = step.notes;

  // Duração em segundos
  if (step.duration) {
    const unit = step.durationUnit ?? 'min';
    switch (unit) {
      case 'sec':
        converted.duration = step.duration;
        break;
      case 'min':
        converted.duration = step.duration * 60;
        break;
      case 'hr':
        converted.duration = step.duration * 3600;
        break;
      default:
        converted.duration = step.duration * 60;
    }
  }

  // Intensidade/targets conforme disciplina
  if (discipline === 'bike' && step.powerTarget) {
    converted.power = { value: step.powerTarget, units: 'w' };
  }

  if (step.hrTarget) {
    converted.hr = { value: step.hrTarget, units: 'bpm' };
  }

  if (step.cadenceTarget) {
    converted.cadence = { value: step.cadenceTarget };
  }

  return converted;
}

function buildIntervalsWorkoutPayload(
  plannedWorkout: typeof schema.plannedWorkouts.$inferSelect,
): Record<string, unknown> {
  const discipline = plannedWorkout.discipline;
  const type = DISCIPLINE_TO_INTERVALS_TYPE[discipline] ?? 'Other';

  const payload: Record<string, unknown> = {
    name: plannedWorkout.title ?? `Treino ${discipline}`,
    description: plannedWorkout.description ?? '',
    type,
    day: plannedWorkout.scheduledDate,
  };

  // Converte duração total se disponível
  if (plannedWorkout.durationMin) {
    payload.moving_time = plannedWorkout.durationMin * 60;
  }

  // Converte distancia se disponivel
  if (plannedWorkout.distanceM) {
    payload.distance = plannedWorkout.distanceM;
  }

  // Converte TSS estimado
  if (plannedWorkout.tssEstimate) {
    payload.icu_training_load = Number(plannedWorkout.tssEstimate);
  }

  // Converte estrutura do treino em steps do intervals.icu
  const structure = plannedWorkout.structure as WorkoutStructure | null;

  if (structure) {
    const steps: Record<string, unknown>[] = [];

    // Warmup
    if (structure.warmup) {
      for (const step of structure.warmup) {
        steps.push({
          ...convertStepToIntervals(step, discipline),
          ramp: true,
        });
      }
    }

    // Main set
    const mainSteps = structure.main ?? structure.steps;
    if (mainSteps) {
      for (const step of mainSteps) {
        steps.push(convertStepToIntervals(step, discipline));
      }
    }

    // Cooldown
    if (structure.cooldown) {
      for (const step of structure.cooldown) {
        steps.push({
          ...convertStepToIntervals(step, discipline),
          ramp: true,
        });
      }
    }

    if (steps.length > 0) {
      payload.steps = steps;
    }
  }

  return payload;
}

// ── Servico principal ──────────────────────────────────────────

/**
 * Envia um treino planejado para o intervals.icu.
 *
 * 1. Busca o planned_workout completo
 * 2. Busca integracao intervals.icu (descriptografa tokens)
 * 3. Converte treino para formato intervals.icu
 * 4. POST na API do intervals.icu
 * 5. Salva intervals_workout_id no planned_workout
 * 6. Marca sent_to_watch = true, sent_at = now
 * 7. Retorna o workout criado
 */
export async function sendWorkout(
  userId: string,
  plannedWorkoutId: string,
): Promise<{
  plannedWorkout: typeof schema.plannedWorkouts.$inferSelect;
  intervalsWorkout: IntervalsWorkoutResponse;
}> {
  // 1. Busca treino planejado
  const plannedWorkout = await db.query.plannedWorkouts.findFirst({
    where: and(
      eq(schema.plannedWorkouts.id, plannedWorkoutId),
      eq(schema.plannedWorkouts.userId, userId),
    ),
  });

  if (!plannedWorkout) {
    throw {
      code: 'ERR_WORKOUT_NOT_FOUND',
      message: 'Treino planejado nao encontrado',
      status: 404,
    };
  }

  // Verifica se ja foi enviado
  if (plannedWorkout.sentToWatch && plannedWorkout.intervalsWorkoutId) {
    throw {
      code: 'ERR_WORKOUT_ALREADY_SENT',
      message: 'Este treino ja foi enviado para o relogio',
      status: 409,
    };
  }

  // 2. Busca integracao intervals.icu
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(schema.integrations.userId, userId),
      eq(schema.integrations.provider, PROVIDER),
      eq(schema.integrations.active, true),
    ),
  });

  if (!integration) {
    throw {
      code: 'ERR_INTERVALS_NOT_CONNECTED',
      message: 'Integracao intervals.icu nao encontrada ou inativa',
      status: 404,
    };
  }

  if (!integration.externalUserId) {
    throw {
      code: 'ERR_INTERVALS_NO_ATHLETE_ID',
      message: 'Athlete ID do intervals.icu nao disponivel',
      status: 400,
    };
  }

  // Descriptografa access token
  const accessToken = decrypt(integration.accessTokenEnc);
  const athleteId = integration.externalUserId;

  // 3. Converte treino para formato intervals.icu
  const workoutPayload = buildIntervalsWorkoutPayload(plannedWorkout);

  // 4. POST na API do intervals.icu
  const url = `${INTERVALS_API_BASE}/athlete/${athleteId}/workouts`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workoutPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    if (response.status === 401) {
      throw {
        code: 'ERR_INTERVALS_UNAUTHORIZED',
        message: 'Token do intervals.icu expirado ou invalido. Reconecte a integracao.',
        status: 401,
      };
    }

    throw {
      code: 'ERR_INTERVALS_API',
      message: `Erro na API intervals.icu: ${response.status} - ${errorBody}`,
      status: 502,
    };
  }

  const intervalsWorkout = (await response.json()) as IntervalsWorkoutResponse;

  // 5 e 6. Atualiza planned_workout com ID do intervals e marca como enviado
  const [updatedWorkout] = await db
    .update(schema.plannedWorkouts)
    .set({
      intervalsWorkoutId: intervalsWorkout.id,
      sentToWatch: true,
      sentAt: new Date(),
    })
    .where(eq(schema.plannedWorkouts.id, plannedWorkoutId))
    .returning();

  if (!updatedWorkout) {
    throw {
      code: 'ERR_WORKOUT_UPDATE_FAILED',
      message: 'Falha ao atualizar treino planejado apos envio',
      status: 500,
    };
  }

  // 7. Retorna resultado
  return {
    plannedWorkout: updatedWorkout,
    intervalsWorkout,
  };
}
