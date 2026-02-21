import cron from 'node-cron';
import { eq, and, lt } from 'drizzle-orm';
import { db } from '../lib/db.js';
import * as schema from '../../drizzle/schema.js';
import { refreshStravaToken } from '../modules/integration/strava-sync.service.js';

/**
 * Job de renovacao proativa de tokens Strava.
 * Executa diariamente as 06:00.
 *
 * Busca todas as integracoes Strava ativas cujo token
 * expira nas proximas 24 horas e renova preventivamente.
 */
export function startTokenRefreshJob(): cron.ScheduledTask {
  const task = cron.schedule('0 6 * * *', async () => {
    console.log('[token-refresh-job] Iniciando renovacao de tokens');
    const startTime = Date.now();

    try {
      // Busca tokens que expiram nas proximas 24 horas
      const expirationThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const expiringIntegrations = await db
        .select()
        .from(schema.integrations)
        .where(
          and(
            eq(schema.integrations.provider, 'strava'),
            eq(schema.integrations.active, true),
            lt(schema.integrations.expiresAt, expirationThreshold),
          ),
        );

      console.log(
        `[token-refresh-job] ${expiringIntegrations.length} tokens a renovar`,
      );

      let succeeded = 0;
      let failed = 0;

      for (const integration of expiringIntegrations) {
        try {
          await refreshStravaToken(integration);
          succeeded++;
          console.log(
            `[token-refresh-job] Token renovado para usuario ${integration.userId}`,
          );
        } catch (err) {
          failed++;
          const errorMsg =
            err instanceof Error ? err.message : 'Erro desconhecido';
          console.error(
            `[token-refresh-job] Falha ao renovar token do usuario ${integration.userId}: ${errorMsg}`,
          );
        }
      }

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[token-refresh-job] Concluido em ${durationSec}s — ` +
          `${succeeded}/${expiringIntegrations.length} sucesso, ${failed} falhas`,
      );
    } catch (err) {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(
        `[token-refresh-job] Erro fatal apos ${durationSec}s:`,
        err,
      );
    }
  });

  console.log('[token-refresh-job] Job agendado: diariamente as 06:00 (0 6 * * *)');
  return task;
}
