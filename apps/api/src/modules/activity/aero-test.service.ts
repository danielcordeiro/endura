import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { resampleStepHold } from './activity-analytics.js';
import { runAeroTest, type AeroTestLapInput, type AeroTestResult } from './aero-test.js';
import type { AeroStreams } from './aero.js';
import * as bikeService from '../bike/bike.service.js';
import * as athleteService from '../athlete/athlete.service.js';

interface StoredLap { lapIndex: number; startOffsetSec: number; name: string | null }

function notFound(msg: string): never {
  throw { code: 'ERR_NOT_FOUND', message: msg, status: 404 };
}

// ── Rodar o Teste Aero de uma atividade ───────────────────────────
export async function runAeroTestForActivity(userId: string, activityId: string): Promise<AeroTestResult> {
  const activity = await db.query.activities.findFirst({
    where: and(eq(schema.activities.id, activityId), eq(schema.activities.userId, userId)),
  });
  if (!activity) notFound('Atividade nao encontrada');
  if (activity.discipline !== 'bike') {
    throw { code: 'ERR_NOT_BIKE', message: 'Teste Aero so vale para ciclismo', status: 400 };
  }
  if (!activity.hasStreams) {
    throw { code: 'ERR_NO_STREAMS', message: 'Atividade sem series temporais', status: 400 };
  }

  const streamRow = await db.query.activityStreams.findFirst({
    where: eq(schema.activityStreams.activityId, activityId),
  });
  if (!streamRow) notFound('Series temporais nao encontradas');

  const timeSec = streamRow.timeSec as number[];
  const present = (a: unknown[] | null | undefined) => !!a && a.length > 0;
  const movingRaw = (streamRow.moving as boolean[] | null)?.map((m) => (m ? 1 : 0)) ?? null;

  const streams: AeroStreams = {
    power: resampleStepHold(timeSec, streamRow.watts as number[] | null),
    speed: resampleStepHold(timeSec, streamRow.velocityMs as number[] | null),
    altitude: resampleStepHold(timeSec, streamRow.altitudeM as number[] | null),
    temp: resampleStepHold(timeSec, streamRow.tempC as number[] | null),
    distance: resampleStepHold(timeSec, streamRow.distanceM as number[] | null),
    grade: resampleStepHold(timeSec, streamRow.gradePct as number[] | null),
    moving: resampleStepHold(timeSec, movingRaw),
    hasPower: present(streamRow.watts as unknown[] | null),
    hasSpeed: present(streamRow.velocityMs as unknown[] | null),
    hasAltitude: present(streamRow.altitudeM as unknown[] | null),
    hasDistance: present(streamRow.distanceM as unknown[] | null),
    hasTemp: present(streamRow.tempC as unknown[] | null),
    hasGrade: present(streamRow.gradePct as unknown[] | null),
    hasMoving: present(streamRow.moving as unknown[] | null),
  };

  const totalEndSec = streams.speed.length - 1;

  // Rótulos existentes (se re-rodando) — preserva o que o usuário nomeou por lap.
  const existing = await db.query.aeroTests.findFirst({ where: eq(schema.aeroTests.activityId, activityId) });
  const prevLabels = new Map<number, string | null>();
  const prevResult = existing?.result as AeroTestResult | undefined;
  for (const l of prevResult?.laps ?? []) prevLabels.set(l.lapIndex, l.label ?? null);

  const prevLaps = ((activity.analysis as { laps?: StoredLap[] } | null)?.laps ?? [])
    .slice()
    .sort((a, b) => a.startOffsetSec - b.startOffsetSec);
  const laps: AeroTestLapInput[] = prevLaps.map((lap, i) => ({
    lapIndex: lap.lapIndex,
    startSec: lap.startOffsetSec,
    endSec: i + 1 < prevLaps.length ? prevLaps[i + 1]!.startOffsetSec - 1 : totalEndSec,
    label: prevLabels.get(lap.lapIndex) ?? lap.name ?? null,
  }));

  const profile = await db.query.athleteProfiles.findFirst({ where: eq(schema.athleteProfiles.userId, userId) });
  const bike = await bikeService.resolveBikeForActivity(userId, activity.bikeId);
  const setup = bikeService.bikeToSetup(bike);
  const weightKg = await athleteService.resolveWeightKg(userId, profile);

  const result = runAeroTest(streams, laps, { weightKg }, setup);
  if (!result) {
    throw {
      code: 'ERR_AERO_TEST_FAILED',
      message: 'Nao deu pra estimar — precisa de potencia, velocidade e altitude, e trecho continuo em movimento.',
      status: 422,
    };
  }

  const row = { crr: String(result.crr), result: result as unknown as Record<string, unknown>, updatedAt: new Date() };
  await db
    .insert(schema.aeroTests)
    .values({ userId, activityId, ...row })
    .onConflictDoUpdate({ target: schema.aeroTests.activityId, set: row });

  return result;
}

// ── Buscar o Teste Aero salvo ─────────────────────────────────────
export async function getAeroTest(userId: string, activityId: string): Promise<AeroTestResult | null> {
  const row = await db.query.aeroTests.findFirst({
    where: and(eq(schema.aeroTests.activityId, activityId), eq(schema.aeroTests.userId, userId)),
  });
  return (row?.result as AeroTestResult | undefined) ?? null;
}

// ── Renomear posições (rótulos por lap) ───────────────────────────
export async function updateAeroTestLabels(
  userId: string,
  activityId: string,
  labels: { lapIndex: number; label: string | null }[],
): Promise<AeroTestResult> {
  const row = await db.query.aeroTests.findFirst({
    where: and(eq(schema.aeroTests.activityId, activityId), eq(schema.aeroTests.userId, userId)),
  });
  if (!row) notFound('Teste Aero nao encontrado');

  const result = row.result as AeroTestResult;
  const byIndex = new Map(labels.map((l) => [l.lapIndex, l.label]));
  result.laps = result.laps.map((l) =>
    byIndex.has(l.lapIndex) ? { ...l, label: byIndex.get(l.lapIndex) ?? null } : l,
  );

  await db
    .update(schema.aeroTests)
    .set({ result: result as unknown as Record<string, unknown>, updatedAt: new Date() })
    .where(eq(schema.aeroTests.activityId, activityId));

  return result;
}
