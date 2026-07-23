// Backfill único: roda a análise avançada (streams + intervalos + NP/TSS/
// zonas) para atividades de bike/run do intervals.icu já sincronizadas ANTES
// da ingestão de streams existir (hasStreams=false). Idempotente.
//
// Uso: pnpm exec tsx --env-file=.env scripts/backfill-intervals-analysis.ts

import { eq, and } from 'drizzle-orm';
import { db } from '../src/lib/db.js';
import * as schema from '../drizzle/schema.js';
import { decrypt } from '../src/lib/encryption.js';
import { ingestIntervalsAnalysis } from '../src/modules/integration/intervals-activities-sync.service.js';

function makeAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}`;
}

async function main() {
  const integrations = await db.query.integrations.findMany({
    where: and(eq(schema.integrations.provider, 'intervals_icu'), eq(schema.integrations.active, true)),
  });

  console.log(`[backfill-intervals] ${integrations.length} integracao(oes) intervals.icu ativa(s)`);

  for (const integration of integrations) {
    const userId = integration.userId;
    const pending = await db.query.activities.findMany({
      where: and(
        eq(schema.activities.userId, userId),
        eq(schema.activities.source, 'intervals_icu'),
        eq(schema.activities.hasStreams, false),
      ),
    });
    const targets = pending.filter((a) => a.discipline === 'bike' || a.discipline === 'run');
    console.log(`[backfill-intervals] userId=${userId}: ${targets.length} atividades bike/run pendentes (de ${pending.length} sem streams)`);

    if (targets.length === 0) continue;

    const apiKey = decrypt(integration.accessTokenEnc);
    const authHeader = makeAuthHeader(apiKey);

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const act of targets) {
      if (!act.externalId) {
        skipped++;
        continue;
      }
      try {
        await ingestIntervalsAnalysis(userId, act.id, act.discipline, authHeader, act.externalId);
        processed++;
        console.log(`[backfill-intervals] OK ${act.discipline} ${act.startedAt.toISOString().slice(0, 10)} "${act.title}"`);
      } catch (err) {
        failed++;
        console.warn(`[backfill-intervals] FALHOU ${act.id} (${act.externalId}):`, err instanceof Error ? err.message : err);
      }
    }
    console.log(`[backfill-intervals] userId=${userId}: concluido — ${processed} ok, ${failed} falharam, ${skipped} sem externalId`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[backfill-intervals] erro fatal', err);
  process.exit(1);
});
