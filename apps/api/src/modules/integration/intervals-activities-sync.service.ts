import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { decrypt } from '../../lib/encryption.js';

// ── Config ────────────────────────────────────────────────────────

const PROVIDER = 'intervals_icu';
const API_BASE = 'https://intervals.icu/api/v1';
const BASE_BACKOFF_MS = 1000;
const MAX_RETRIES = 3;

// ── Rate limiter ──────────────────────────────────────────────────

const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 30;

function canMakeRequest(): boolean {
  const oneMinuteAgo = Date.now() - 60_000;
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length < MAX_REQUESTS_PER_MINUTE;
}

function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

function makeAuthHeader(apiKey: string): string {
  const credentials = Buffer.from(`API_KEY:${apiKey}`).toString('base64');
  return `Basic ${credentials}`;
}

async function fetchWithRetry(url: string, authHeader: string, retries: number = MAX_RETRIES): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    while (!canMakeRequest()) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    recordRequest();

    const res = await fetch(url, { headers: { Authorization: authHeader } });

    if (res.ok) return await res.json();
    if (res.status === 401) throw new Error('intervals.icu API key invalida ou expirada');
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, BASE_BACKOFF_MS * Math.pow(2, attempt)));
      continue;
    }
    throw new Error(`intervals.icu API error: ${res.status} ${await res.text()}`);
  }
  throw new Error(`Max retries (${retries}) exceeded for ${url}`);
}

// ── Mapeamento type → discipline ─────────────────────────────────

function intervalsTypeToDiscipline(type: string | undefined): string {
  if (!type) return 'other';
  const t = type.toLowerCase();
  if (t.includes('run')) return 'run';
  if (t.includes('ride') || t.includes('bike') || t.includes('cycl')) return 'bike';
  if (t.includes('swim')) return 'swim';
  return 'other';
}

// ── Tipos ─────────────────────────────────────────────────────────

interface IntervalsActivity {
  id: string | number;
  type?: string;
  name?: string;
  description?: string | null;
  start_date_local?: string;
  start_date?: string;
  elapsed_time?: number;
  moving_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  icu_training_load?: number;
  calories?: number;
  start_latlng?: [number, number] | null;
  perceived_exertion?: number;
  [key: string]: unknown;
}

export interface ActivitySyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

// ── Sync por usuario ──────────────────────────────────────────────

export async function syncActivitiesForUser(
  userId: string,
  options: { oldest?: string; newest?: string } = {},
): Promise<ActivitySyncResult> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(schema.integrations.userId, userId),
      eq(schema.integrations.provider, PROVIDER),
      eq(schema.integrations.active, true),
    ),
  });

  if (!integration || !integration.externalUserId) {
    return { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 };
  }

  const startTime = Date.now();

  await db.update(schema.integrations)
    .set({ syncStatus: 'syncing', updatedAt: new Date() })
    .where(eq(schema.integrations.id, integration.id));

  try {
    const apiKey = decrypt(integration.accessTokenEnc);
    const authHeader = makeAuthHeader(apiKey);
    const athleteId = integration.externalUserId;

    // Default: ultimos 30 dias
    const today = new Date();
    const oldestStr = options.oldest ?? new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]!;
    const newestStr = options.newest ?? today.toISOString().split('T')[0]!;

    const url = `${API_BASE}/athlete/${athleteId}/activities?oldest=${oldestStr}&newest=${newestStr}`;
    const activities = (await fetchWithRetry(url, authHeader)) as IntervalsActivity[];

    if (!Array.isArray(activities)) {
      throw new Error('Resposta inesperada da API intervals.icu (activities)');
    }

    const result: ActivitySyncResult = {
      fetched: activities.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const act of activities) {
      try {
        // Preferimos start_date (UTC real) em vez de start_date_local (sem TZ,
        // Node interpreta como UTC e causa drift de 3h para atletas em America/Sao_Paulo).
        const startedAtStr = act.start_date ?? act.start_date_local;
        if (!startedAtStr) {
          result.skipped++;
          continue;
        }

        const externalId = String(act.id);
        const discipline = intervalsTypeToDiscipline(act.type);
        const durationSec = act.elapsed_time ?? act.moving_time ?? null;

        // Deduplicacao por external_id + source (intervals_icu)
        const existingByIntervals = await db.query.activities.findFirst({
          where: and(
            eq(schema.activities.userId, userId),
            eq(schema.activities.externalId, externalId),
            eq(schema.activities.source, PROVIDER),
          ),
        });

        // Dedup cross-source: mesma disciplina, duracao proxima (+/-30s),
        // horario dentro de 6h (cobre drift de timezone e arredondamentos).
        if (!existingByIntervals) {
          const startedAt = new Date(startedAtStr);
          const windowStart = new Date(startedAt.getTime() - 6 * 3600_000);
          const windowEnd = new Date(startedAt.getTime() + 6 * 3600_000);
          const sameTimeActivities = await db.query.activities.findMany({
            where: and(
              eq(schema.activities.userId, userId),
              eq(schema.activities.discipline, discipline),
            ),
          });
          const overlap = sameTimeActivities.find((a) => {
            if (a.source === PROVIDER) return false;
            if (a.startedAt < windowStart || a.startedAt > windowEnd) return false;
            if (durationSec != null && a.durationSec != null) {
              return Math.abs(a.durationSec - durationSec) <= 30;
            }
            // fallback: sem duracao para comparar, usa janela estreita de 10min
            return Math.abs(a.startedAt.getTime() - startedAt.getTime()) <= 10 * 60_000;
          });
          if (overlap) {
            result.skipped++;
            continue;
          }
        }

        const activityData = {
          userId,
          externalId,
          source: PROVIDER,
          discipline,
          title: act.name ?? `${discipline} intervals.icu`,
          startedAt: new Date(startedAtStr),
          durationSec: act.elapsed_time ?? act.moving_time ?? null,
          distanceM: act.distance != null ? String(act.distance) : null,
          avgHr: act.average_heartrate ? Math.round(act.average_heartrate) : null,
          maxHr: act.max_heartrate ? Math.round(act.max_heartrate) : null,
          avgPowerW: act.average_watts ? Math.round(act.average_watts) : null,
          elevationM: act.total_elevation_gain != null ? String(act.total_elevation_gain) : null,
          calories: act.calories ? Math.round(act.calories) : null,
          latStart: act.start_latlng?.[0] != null ? String(act.start_latlng[0]) : null,
          lonStart: act.start_latlng?.[1] != null ? String(act.start_latlng[1]) : null,
          perceivedEffort: act.perceived_exertion ? Math.round(act.perceived_exertion) : null,
          notes: act.description ?? null,
          rawData: act as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        };

        if (existingByIntervals) {
          await db.update(schema.activities)
            .set(activityData)
            .where(eq(schema.activities.id, existingByIntervals.id));
          result.updated++;
        } else {
          await db.insert(schema.activities).values({ ...activityData, createdAt: new Date() });
          result.inserted++;
        }
      } catch {
        result.errors++;
      }
    }

    const durationMs = Date.now() - startTime;

    await db.update(schema.integrations)
      .set({ syncStatus: 'idle', lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.integrations.id, integration.id));

    await db.insert(schema.syncLogs).values({
      userId,
      provider: PROVIDER,
      outcome: result.errors === 0 ? 'success' : 'failure',
      activitiesSynced: result.inserted + result.updated,
      durationMs,
      errorDetails: result.errors > 0 ? `${result.errors} atividades falharam` : null,
    });

    return result;
  } catch (err) {
    await db.update(schema.integrations)
      .set({ syncStatus: 'error', updatedAt: new Date() })
      .where(eq(schema.integrations.id, integration.id));

    await db.insert(schema.syncLogs).values({
      userId,
      provider: PROVIDER,
      outcome: 'failure',
      activitiesSynced: 0,
      errorDetails: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

// ── Sync para todos usuarios conectados ───────────────────────────

export async function syncActivitiesAllUsers(): Promise<{ total: number; succeeded: number; failed: number }> {
  const integrations = await db.query.integrations.findMany({
    where: and(
      eq(schema.integrations.provider, PROVIDER),
      eq(schema.integrations.active, true),
    ),
  });

  let succeeded = 0;
  let failed = 0;

  for (const integration of integrations) {
    try {
      await syncActivitiesForUser(integration.userId);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { total: integrations.length, succeeded, failed };
}
