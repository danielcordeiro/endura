// Backfill único: roda a análise avançada (streams + laps + NP/TSS/zonas)
// para atividades de bike/run do Strava já sincronizadas ANTES da ingestão
// de streams existir (hasStreams=false). Idempotente — pode rodar de novo,
// só pega o que ainda falta.
//
// Uso: pnpm exec tsx --env-file=.env scripts/backfill-activity-analysis.ts

import { eq, and } from 'drizzle-orm';
import { db } from '../src/lib/db.js';
import * as schema from '../drizzle/schema.js';
import { getValidAccessToken, ingestActivityAnalysis } from '../src/modules/integration/strava-sync.service.js';

async function main() {
  const integrations = await db.query.integrations.findMany({
    where: and(eq(schema.integrations.provider, 'strava'), eq(schema.integrations.active, true)),
  });

  console.log(`[backfill] ${integrations.length} integracao(oes) Strava ativa(s)`);

  for (const integration of integrations) {
    const userId = integration.userId;
    const pending = await db.query.activities.findMany({
      where: and(
        eq(schema.activities.userId, userId),
        eq(schema.activities.source, 'strava'),
        eq(schema.activities.hasStreams, false),
      ),
    });
    const targets = pending.filter((a) => a.discipline === 'bike' || a.discipline === 'run');
    console.log(`[backfill] userId=${userId}: ${targets.length} atividades bike/run pendentes (de ${pending.length} sem streams)`);

    if (targets.length === 0) continue;

    const accessToken = await getValidAccessToken(integration);
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const act of targets) {
      if (!act.externalId) {
        skipped++;
        continue;
      }
      try {
        await ingestActivityAnalysis(userId, act.id, act.discipline, accessToken, Number(act.externalId));
        processed++;
        console.log(`[backfill] OK ${act.discipline} ${act.startedAt.toISOString().slice(0, 10)} "${act.title}"`);
      } catch (err) {
        failed++;
        console.warn(`[backfill] FALHOU ${act.id} (strava ${act.externalId}):`, err instanceof Error ? err.message : err);
      }
    }
    console.log(`[backfill] userId=${userId}: concluido — ${processed} ok, ${failed} falharam, ${skipped} sem externalId`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[backfill] erro fatal', err);
  process.exit(1);
});
