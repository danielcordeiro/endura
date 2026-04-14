import cron from 'node-cron';
import { syncAllUsersWellness } from '../modules/integration/wellness-sync.service.js';

/**
 * Job de sincronizacao de dados de wellness via intervals.icu.
 * Roda a cada 4 horas para puxar HRV, sono, SpO2, stress e body battery.
 */
export function startWellnessSyncJob(): void {
  const schedule = '30 */4 * * *'; // A cada 4 horas, no minuto 30
  console.log(`[wellness-sync-job] Job agendado: a cada 4 horas (${schedule})`);

  cron.schedule(schedule, async () => {
    console.log('[wellness-sync-job] Iniciando sync de wellness...');
    try {
      const result = await syncAllUsersWellness();
      console.log(
        `[wellness-sync-job] Concluido: ${result.succeeded}/${result.total} usuarios sincronizados` +
        (result.failed > 0 ? `, ${result.failed} falhas` : ''),
      );
    } catch (err) {
      console.error('[wellness-sync-job] Erro fatal:', err);
    }
  });
}
