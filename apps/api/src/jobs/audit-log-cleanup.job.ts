import cron from 'node-cron';
import { lt } from 'drizzle-orm';
import { db } from '../lib/db.js';
import * as schema from '../../drizzle/schema.js';

const RETENTION_DAYS = 90;

/**
 * Limpa api_audit_logs com mais de 90 dias.
 * Executa diariamente as 03:30.
 */
export function startAuditLogCleanupJob(): cron.ScheduledTask {
  const task = cron.schedule('30 3 * * *', async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000);
    const startTime = Date.now();
    try {
      const result = await db
        .delete(schema.apiAuditLogs)
        .where(lt(schema.apiAuditLogs.createdAt, cutoff))
        .returning({ id: schema.apiAuditLogs.id });

      console.log(
        `[audit-log-cleanup] removed ${result.length} rows older than ${RETENTION_DAYS}d in ${Date.now() - startTime}ms`,
      );
    } catch (err) {
      console.error('[audit-log-cleanup] failed', err);
    }
  });

  task.start();
  return task;
}
