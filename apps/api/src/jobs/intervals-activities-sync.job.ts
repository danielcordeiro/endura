import cron from 'node-cron';
import { syncActivitiesAllUsers } from '../modules/integration/intervals-activities-sync.service.js';

/**
 * Job de sincronizacao de atividades executadas via intervals.icu.
 * Roda a cada 2 horas (offset de 15 min para nao colidir com strava-sync job).
 * Serve como fallback para usuarios que nao tem Strava conectado.
 */
export function startIntervalsActivitiesSyncJob(): void {
  const schedule = '15 */2 * * *'; // A cada 2 horas, no minuto 15
  console.log(`[intervals-activities-sync-job] Job agendado: a cada 2 horas (${schedule})`);

  cron.schedule(schedule, async () => {
    console.log('[intervals-activities-sync-job] Iniciando sync de atividades...');
    try {
      const result = await syncActivitiesAllUsers();
      console.log(
        `[intervals-activities-sync-job] Concluido: ${result.succeeded}/${result.total} usuarios sincronizados` +
        (result.failed > 0 ? `, ${result.failed} falhas` : ''),
      );
    } catch (err) {
      console.error('[intervals-activities-sync-job] Erro fatal:', err);
    }
  });
}
