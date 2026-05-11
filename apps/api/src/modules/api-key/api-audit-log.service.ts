import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';

export interface AuditLogEntry {
  apiKeyId?: string | null;
  userId: string;
  method: string;
  path: string;
  statusCode: number;
  resourceId?: string | null;
}

/**
 * Insere uma entrada de audit log. Fire-and-forget — nao bloqueia a resposta
 * e nao propaga erros (eventuais falhas sao apenas logadas, nunca quebram a
 * request principal).
 */
export function logApiWrite(entry: AuditLogEntry): void {
  db.insert(schema.apiAuditLogs)
    .values({
      apiKeyId: entry.apiKeyId ?? null,
      userId: entry.userId,
      method: entry.method,
      path: entry.path,
      statusCode: entry.statusCode,
      resourceId: entry.resourceId ?? null,
    })
    .catch((err) => {
      // log no stderr para nao perder, mas nao re-throw
      console.error('[api-audit-log] insert failed', err);
    });
}
