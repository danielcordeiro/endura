// Recomputa `activities.analysis`/`tss` a partir das streams JÁ salvas em
// activity_streams — sem nenhuma chamada à API do Strava. Usado depois de
// mudanças no motor de análise (activity-analytics.ts) pra propagar o fix
// pras atividades que já foram ingeridas com a lógica antiga, sem gastar
// rate limit refazendo o fetch de streams/laps.
//
// Uso: pnpm exec tsx --env-file=.env scripts/recompute-activity-analysis.ts

import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db.js';
import * as schema from '../drizzle/schema.js';
import { analyzeActivity, type StreamData, type LapInput, type Discipline } from '../src/modules/activity/activity-analytics.js';

interface StoredLap {
  lapIndex: number;
  startOffsetSec: number;
  name: string | null;
}

async function main() {
  const activities = await db.query.activities.findMany({
    where: eq(schema.activities.hasStreams, true),
  });
  console.log(`[recompute] ${activities.length} atividades com streams pra recomputar`);

  let ok = 0;
  let failed = 0;
  const profileCache = new Map<string, {
    ftpWatts: number | null; maxHr: number | null; weightKg: number | null;
    bikeWeightKg: number | null; crr: number | null; drivetrainEff: number | null;
  }>();

  for (const act of activities) {
    try {
      const streamRow = await db.query.activityStreams.findFirst({
        where: eq(schema.activityStreams.activityId, act.id),
      });
      if (!streamRow) {
        console.warn(`[recompute] SKIP ${act.id}: hasStreams=true mas sem linha em activity_streams`);
        failed++;
        continue;
      }

      const streamData: StreamData = {
        timeSec: streamRow.timeSec as number[],
        watts: streamRow.watts as number[] | null,
        heartRate: streamRow.heartRate as number[] | null,
        cadence: streamRow.cadence as number[] | null,
        distanceM: streamRow.distanceM as number[] | null,
        altitudeM: streamRow.altitudeM as number[] | null,
        velocityMs: streamRow.velocityMs as number[] | null,
        gradePct: streamRow.gradePct as number[] | null,
        moving: streamRow.moving as boolean[] | null,
        tempC: streamRow.tempC as number[] | null,
      };

      const totalEndSec = streamData.timeSec.length > 0
        ? Math.floor(streamData.timeSec[streamData.timeSec.length - 1]!)
        : 0;

      const prevLaps = ((act.analysis as { laps?: StoredLap[] } | null)?.laps ?? [])
        .slice()
        .sort((a, b) => a.startOffsetSec - b.startOffsetSec);

      const laps: LapInput[] = prevLaps.map((lap, i) => ({
        lapIndex: lap.lapIndex,
        startOffsetSec: lap.startOffsetSec,
        endOffsetSec: i + 1 < prevLaps.length ? prevLaps[i + 1]!.startOffsetSec - 1 : totalEndSec,
        name: lap.name,
      }));

      if (!profileCache.has(act.userId)) {
        const profile = await db.query.athleteProfiles.findFirst({
          where: eq(schema.athleteProfiles.userId, act.userId),
        });
        profileCache.set(act.userId, {
          ftpWatts: profile?.ftpWatts ?? null,
          maxHr: profile?.maxHr ?? null,
          weightKg: profile?.weightKg ? Number(profile.weightKg) : null,
          bikeWeightKg: profile?.bikeWeightKg ? Number(profile.bikeWeightKg) : null,
          crr: profile?.crr ? Number(profile.crr) : null,
          drivetrainEff: profile?.drivetrainEfficiency ? Number(profile.drivetrainEfficiency) : null,
        });
      }
      const ctx = profileCache.get(act.userId)!;

      const result = analyzeActivity(streamData, laps, act.discipline as Discipline, ctx);

      await db
        .update(schema.activities)
        .set({
          analysis: result as unknown as Record<string, unknown>,
          tss: result.summary.tss != null ? String(result.summary.tss) : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.activities.id, act.id));

      ok++;
    } catch (err) {
      failed++;
      console.warn(`[recompute] FALHOU ${act.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[recompute] concluido — ${ok} ok, ${failed} falharam`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[recompute] erro fatal', err);
  process.exit(1);
});
