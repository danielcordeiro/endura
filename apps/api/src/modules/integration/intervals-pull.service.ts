import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { decrypt } from '../../lib/encryption.js';

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

// ── Tipos da resposta /events ─────────────────────────────────────

interface IntervalsEvent {
  id: number | string;
  start_date_local?: string;
  name?: string;
  description?: string;
  type?: string;               // Run / Ride / Swim / Other / VirtualRide / ...
  category?: string;           // WORKOUT / RACE_A / NOTE / ...
  moving_time?: number | null; // segundos
  distance?: number | null;    // metros
  icu_training_load?: number | null;
  workout_doc?: unknown;
  [key: string]: unknown;
}

// ── Mapeamento reverso type → discipline ──────────────────────────

function intervalsTypeToDiscipline(type: string | undefined): string {
  if (!type) return 'other';
  const t = type.toLowerCase();
  if (t.includes('run')) return 'run';
  if (t.includes('ride') || t.includes('bike') || t.includes('cycl')) return 'bike';
  if (t.includes('swim')) return 'swim';
  return 'other';
}

function extractDateOnly(isoOrDate: string | undefined): string | null {
  if (!isoOrDate) return null;
  const date = isoOrDate.split('T')[0];
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

// ── Pull principal ────────────────────────────────────────────────

export interface PullResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

export async function pullPlannedWorkouts(
  userId: string,
  oldest: string,
  newest: string,
): Promise<PullResult> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(schema.integrations.userId, userId),
      eq(schema.integrations.provider, PROVIDER),
      eq(schema.integrations.active, true),
    ),
  });

  if (!integration || !integration.externalUserId) {
    throw {
      code: 'ERR_INTERVALS_NOT_CONNECTED',
      message: 'Integracao intervals.icu nao encontrada ou inativa',
      status: 404,
    };
  }

  const apiKey = decrypt(integration.accessTokenEnc);
  const authHeader = makeAuthHeader(apiKey);
  const athleteId = integration.externalUserId;

  const params = new URLSearchParams({
    oldest,
    newest,
    category: 'WORKOUT',
    resolve: 'false',
  });
  const url = `${API_BASE}/athlete/${athleteId}/events?${params.toString()}`;

  const events = (await fetchWithRetry(url, authHeader)) as IntervalsEvent[];
  if (!Array.isArray(events)) {
    throw new Error('Resposta inesperada da API intervals.icu (events)');
  }

  const result: PullResult = { fetched: events.length, inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const ev of events) {
    try {
      const scheduledDate = extractDateOnly(ev.start_date_local);
      if (!scheduledDate) {
        result.skipped++;
        continue;
      }

      const intervalsId = String(ev.id);
      const discipline = intervalsTypeToDiscipline(ev.type);
      const durationMin = ev.moving_time ? Math.round(ev.moving_time / 60) : null;
      const distanceM = ev.distance ? Math.round(ev.distance) : null;
      const tssEstimate = ev.icu_training_load != null ? String(ev.icu_training_load) : null;
      const structure = ev.workout_doc ?? null;

      const existing = await db.query.plannedWorkouts.findFirst({
        where: and(
          eq(schema.plannedWorkouts.userId, userId),
          eq(schema.plannedWorkouts.intervalsWorkoutId, intervalsId),
        ),
      });

      if (existing) {
        await db.update(schema.plannedWorkouts)
          .set({
            scheduledDate,
            discipline,
            title: ev.name ?? existing.title,
            description: ev.description ?? existing.description,
            structure: structure as never,
            durationMin,
            distanceM,
            tssEstimate,
          })
          .where(eq(schema.plannedWorkouts.id, existing.id));
        result.updated++;
      } else {
        await db.insert(schema.plannedWorkouts).values({
          planId: null,
          userId,
          scheduledDate,
          discipline,
          title: ev.name ?? `Treino ${discipline}`,
          description: ev.description ?? null,
          structure: structure as never,
          durationMin,
          distanceM,
          tssEstimate,
          intervalsWorkoutId: intervalsId,
          sentToWatch: true,
          sentAt: new Date(),
        });
        result.inserted++;
      }
    } catch {
      result.errors++;
    }
  }

  await db.insert(schema.syncLogs).values({
    userId,
    provider: PROVIDER,
    outcome: result.errors === 0 ? 'success' : 'failure',
    activitiesSynced: result.inserted + result.updated,
    errorDetails: result.errors > 0 ? `${result.errors} workouts falharam` : null,
  });

  return result;
}
