import cron from 'node-cron';
import { syncAllUsers } from '../modules/integration/strava-sync.service.js';

/**
 * Job de sincronizacao automatica com Strava.
 * Executa a cada 2 horas (minuto 0 de horas pares).
 *
 * Busca todas as integracoes Strava ativas e sincroniza
 * as atividades novas de cada usuario.
 */
export function startStravaSyncJob(): cron.ScheduledTask {
  const task = cron.schedule('0 */2 * * *', async () => {
    console.log('[strava-sync-job] Iniciando sincronizacao agendada');
    const startTime = Date.now();

    try {
      const result = await syncAllUsers();
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(
        `[strava-sync-job] Concluido em ${durationSec}s — ` +
          `${result.succeeded}/${result.total} sucesso, ${result.failed} falhas`,
      );
    } catch (err) {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(
        `[strava-sync-job] Erro fatal apos ${durationSec}s:`,
        err,
      );
    }
  });

  console.log('[strava-sync-job] Job agendado: a cada 2 horas (0 */2 * * *)');
  return task;
}
