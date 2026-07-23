// Recomputa `activities.analysis`/`tss` a partir das streams JÁ salvas em
// activity_streams — sem nenhuma chamada à API do Strava. Usado depois de
// mudanças no motor de análise (activity-analytics.ts / aero.ts) pra propagar
// o fix pras atividades já ingeridas, sem gastar rate limit refazendo o fetch.
//
// Reusa recomputeActivityAnalysis (activity.service.ts): fonte única, que
// resolve a bike da atividade (ou padrão) pro CdA.
//
// Uso: pnpm exec tsx --env-file=.env scripts/recompute-activity-analysis.ts

import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db.js';
import * as schema from '../drizzle/schema.js';
import { recomputeActivityAnalysis } from '../src/modules/activity/activity.service.js';

async function main() {
  const activities = await db.query.activities.findMany({
    where: eq(schema.activities.hasStreams, true),
    columns: { id: true, userId: true },
  });
  console.log(`[recompute] ${activities.length} atividades com streams pra recomputar`);

  let ok = 0;
  let failed = 0;

  for (const act of activities) {
    try {
      await recomputeActivityAnalysis(act.userId, act.id);
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
