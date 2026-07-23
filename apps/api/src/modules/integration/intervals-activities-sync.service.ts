import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { decrypt } from '../../lib/encryption.js';
import { analyzeActivity, type StreamData, type LapInput, type Discipline } from '../activity/activity-analytics.js';
import * as bikeService from '../bike/bike.service.js';
import * as athleteService from '../athlete/athlete.service.js';

// ── Config ────────────────────────────────────────────────────────

const PROVIDER = 'intervals_icu';
const API_BASE = 'https://intervals.icu/api/v1';
const BASE_BACKOFF_MS = 1000;
const MAX_RETRIES = 3;

// ── Rate limiter ──────────────────────────────────────────────────
// Por CONTA (chaveado pelo authHeader, que já é único por API key) — cada
// usuário tem sua própria cota no intervals.icu, um limiter global fazia um
// usuário competir pela cota de outro em syncs concorrentes (cron + manual).

const requestTimestampsByAccount = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 30;

function canMakeRequest(accountKey: string): boolean {
  const oneMinuteAgo = Date.now() - 60_000;
  const timestamps = requestTimestampsByAccount.get(accountKey) ?? [];
  while (timestamps.length > 0 && timestamps[0]! < oneMinuteAgo) {
    timestamps.shift();
  }
  requestTimestampsByAccount.set(accountKey, timestamps);
  return timestamps.length < MAX_REQUESTS_PER_MINUTE;
}

function recordRequest(accountKey: string): void {
  const timestamps = requestTimestampsByAccount.get(accountKey) ?? [];
  timestamps.push(Date.now());
  requestTimestampsByAccount.set(accountKey, timestamps);
}

function makeAuthHeader(apiKey: string): string {
  const credentials = Buffer.from(`API_KEY:${apiKey}`).toString('base64');
  return `Basic ${credentials}`;
}

async function fetchWithRetry(url: string, authHeader: string, retries: number = MAX_RETRIES): Promise<unknown> {
  const accountKey = authHeader;
  for (let attempt = 0; attempt < retries; attempt++) {
    while (!canMakeRequest(accountKey)) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    recordRequest(accountKey);

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
  icu_average_watts?: number;
  icu_weighted_avg_watts?: number;
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

// ── Streams + intervalos (análise avançada) ────────────────────────

interface IntervalsStreamItem {
  type: string;
  data: (number | null)[];
}

interface IntervalsIntervalRaw {
  start_index?: number;
  end_index?: number;
  type?: string;
  label?: string | null;
}

interface IntervalsIntervalsResponse {
  icu_intervals?: IntervalsIntervalRaw[];
}

const ANALYZABLE_DISCIPLINES = new Set(['bike', 'run']);

function findStream(streams: IntervalsStreamItem[], type: string): number[] | null {
  const found = streams.find((s) => s.type === type);
  return found ? (found.data as number[]) : null;
}

// ── Ingestão de streams + análise avançada (NP/TSS/zonas) ──────────
// Espelha ingestActivityAnalysis do strava-sync.service.ts, mas usando a API
// do intervals.icu: /activity/{id}/streams (array de {type,data}, mesmo
// esquema de "smart recording" irregular do Strava em atividades outdoor —
// contíguo em atividades indoor/trainer) e /activity/{id}/intervals
// (segmentos auto-detectados por intensidade, não laps manuais — mas com
// index bruto compatível, reaproveitado aqui como "laps" da UI).
export async function ingestIntervalsAnalysis(
  userId: string,
  activityId: string,
  discipline: string,
  authHeader: string,
  intervalsActivityId: string,
): Promise<void> {
  if (!ANALYZABLE_DISCIPLINES.has(discipline)) return;

  const rawStreams = (await fetchWithRetry(
    `${API_BASE}/activity/${intervalsActivityId}/streams`,
    authHeader,
  )) as IntervalsStreamItem[];
  if (!Array.isArray(rawStreams)) return;

  const timeSec = findStream(rawStreams, 'time');
  const elapsedSec = timeSec && timeSec.length > 0 ? timeSec[timeSec.length - 1]! : 0;
  if (!timeSec || timeSec.length < 2 || elapsedSec < 60) return;

  let intervalsResp: IntervalsIntervalsResponse | null = null;
  try {
    intervalsResp = (await fetchWithRetry(
      `${API_BASE}/activity/${intervalsActivityId}/intervals`,
      authHeader,
    )) as IntervalsIntervalsResponse;
  } catch {
    intervalsResp = null; // segue sem laps — não é fatal
  }

  const streamData: StreamData = {
    timeSec,
    watts: findStream(rawStreams, 'watts'),
    heartRate: findStream(rawStreams, 'heartrate'),
    cadence: findStream(rawStreams, 'cadence'),
    distanceM: findStream(rawStreams, 'distance'),
    altitudeM: findStream(rawStreams, 'altitude') ?? findStream(rawStreams, 'fixed_altitude'),
    velocityMs: findStream(rawStreams, 'velocity_smooth'),
    gradePct: findStream(rawStreams, 'grade_smooth'),
    tempC: findStream(rawStreams, 'temp'),
    // intervals.icu não expõe uma stream "moving" separada.
  };

  // Clamp simétrico + conversão índice→segundo via lookup no timeSec (mesmo
  // esquema do Strava) — necessário porque atividades outdoor sincronizadas
  // via intervals.icu também têm "smart recording" irregular (índice bruto
  // != segundo decorrido); só indoor/trainer tem timeSec contíguo.
  const rawIntervals = intervalsResp?.icu_intervals ?? [];
  const laps: LapInput[] = rawIntervals.map((iv, i) => {
    const startIdx = Math.max(0, Math.min(iv.start_index ?? 0, timeSec.length - 1));
    const endIdx = Math.max(0, Math.min(iv.end_index ?? timeSec.length - 1, timeSec.length - 1));
    return {
      lapIndex: i + 1,
      startOffsetSec: Math.floor(timeSec[startIdx] ?? 0),
      endOffsetSec: Math.floor(timeSec[endIdx] ?? 0),
      name: iv.label ?? iv.type ?? null,
    };
  });

  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  const existingActivity = await db.query.activities.findFirst({
    where: eq(schema.activities.id, activityId),
    columns: { bikeId: true },
  });
  const bike = discipline === 'bike'
    ? await bikeService.resolveBikeForActivity(userId, existingActivity?.bikeId ?? null)
    : undefined;

  const ctx = {
    ftpWatts: profile?.ftpWatts ?? null,
    maxHr: profile?.maxHr ?? null,
    weightKg: await athleteService.resolveWeightKg(userId, profile),
    ...bikeService.bikeToSetup(bike),
  };

  const result = analyzeActivity(streamData, laps, discipline as Discipline, ctx);

  const streamRow = {
    timeSec: streamData.timeSec,
    watts: streamData.watts,
    heartRate: streamData.heartRate,
    cadence: streamData.cadence,
    distanceM: streamData.distanceM,
    altitudeM: streamData.altitudeM,
    velocityMs: streamData.velocityMs,
    gradePct: streamData.gradePct,
    moving: null,
    tempC: streamData.tempC,
    sampleCount: timeSec.length,
    source: PROVIDER,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.activityStreams)
    .values({ activityId, ...streamRow })
    .onConflictDoUpdate({ target: schema.activityStreams.activityId, set: streamRow });

  await db
    .update(schema.activities)
    .set({
      analysis: result as unknown as Record<string, unknown>,
      tss: result.summary.tss != null ? String(result.summary.tss) : null,
      hasStreams: true,
      bikeId: bike?.id ?? existingActivity?.bikeId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.activities.id, activityId));
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

        // Dedup cross-source (Strava, Garmin direto, etc.):
        // 1. Mesma disciplina + usuario
        // 2. startedAt dentro de 6h (cobre drift de TZ)
        // 3. Match por distancia (+/-5% ou +/-100m) quando ambos tem.
        //    Natacao especialmente tem divergencia de duracao (Strava conta
        //    descanso entre series; intervals conta so moving time). Distancia
        //    e mais confiavel que duracao.
        // 4. Fallback: sem distancia, match por duracao +/-5min.
        if (!existingByIntervals) {
          const startedAt = new Date(startedAtStr);
          const windowStart = new Date(startedAt.getTime() - 6 * 3600_000);
          const windowEnd = new Date(startedAt.getTime() + 6 * 3600_000);
          const distanceM = act.distance ?? null;

          const sameTimeActivities = await db.query.activities.findMany({
            where: and(
              eq(schema.activities.userId, userId),
              eq(schema.activities.discipline, discipline),
            ),
          });
          const overlap = sameTimeActivities.find((a) => {
            if (a.source === PROVIDER) return false;
            if (a.startedAt < windowStart || a.startedAt > windowEnd) return false;

            const aDistM = a.distanceM != null ? Number(a.distanceM) : null;
            if (distanceM != null && distanceM > 0 && aDistM != null && aDistM > 0) {
              const tolerance = Math.max(100, distanceM * 0.05);
              return Math.abs(aDistM - distanceM) <= tolerance;
            }
            if (durationSec != null && a.durationSec != null) {
              return Math.abs(a.durationSec - durationSec) <= 5 * 60;
            }
            // Ultimo fallback: so horario proximo (janela estreita de 10min)
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
          movingTimeSec: act.moving_time ?? null,
          distanceM: act.distance != null ? String(act.distance) : null,
          avgHr: act.average_heartrate != null ? Math.round(act.average_heartrate) : null,
          maxHr: act.max_heartrate != null ? Math.round(act.max_heartrate) : null,
          // API do intervals.icu usa "icu_average_watts" (não "average_watts" —
          // esse campo nunca veio preenchido; bug pré-existente que zerava a
          // potência de TODA atividade indoor/virtual sincronizada por aqui).
          // Checagem != null (não truthy) — 0W é um valor real possível.
          avgPowerW: (() => {
            const w = act.average_watts ?? act.icu_average_watts;
            return w != null ? Math.round(w) : null;
          })(),
          elevationM: act.total_elevation_gain != null ? String(act.total_elevation_gain) : null,
          calories: act.calories ? Math.round(act.calories) : null,
          latStart: act.start_latlng?.[0] != null ? String(act.start_latlng[0]) : null,
          lonStart: act.start_latlng?.[1] != null ? String(act.start_latlng[1]) : null,
          perceivedEffort: act.perceived_exertion != null ? Math.round(act.perceived_exertion) : null,
          notes: act.description ?? null,
          rawData: act as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        };

        // icu_training_load é o TSS calculado pelo próprio intervals.icu (usa
        // NP/FTP quando há potência, senão HR-based) — usado como fallback
        // SÓ enquanto não temos um TSS melhor (via streams, ingestIntervalsAnalysis
        // abaixo). COALESCE no UPDATE evita que um re-sync pise no TSS mais
        // preciso já calculado — sem isso, toda sincronização voltaria a
        // sobrescrever com a estimativa mais fraca.
        // IMPORTANTE: só protege pra disciplinas analisáveis (bike/run) — pra
        // swim/other, ingestIntervalsAnalysis nunca roda (early-return), então
        // hasStreams nunca vira true e o COALESCE congelaria pra sempre o
        // PRIMEIRO icu_training_load capturado, ignorando recomputos melhores
        // que a intervals.icu faça depois (ex.: após o atleta configurar zonas).
        const tssFallback = act.icu_training_load != null ? String(act.icu_training_load) : null;
        const tssSetOnConflict = ANALYZABLE_DISCIPLINES.has(discipline)
          ? sql`coalesce(${schema.activities.tss}, ${tssFallback})`
          : tssFallback;

        // Upsert atômico sobre o índice único (user_id, external_id, source) —
        // check-then-insert sem transação podia duplicar a atividade num sync
        // concorrente (cron + manual pro mesmo usuário).
        const [upserted] = await db
          .insert(schema.activities)
          .values({ ...activityData, tss: tssFallback, createdAt: new Date() })
          .onConflictDoUpdate({
            target: [schema.activities.userId, schema.activities.externalId, schema.activities.source],
            set: { ...activityData, tss: tssSetOnConflict },
          })
          .returning({
            id: schema.activities.id,
            hasStreams: schema.activities.hasStreams,
            // xmax=0 é o idioma padrão do Postgres pra distinguir INSERT de
            // UPDATE dentro de um INSERT...ON CONFLICT — usar isso em vez do
            // "existingByIntervals" lido ANTES do upsert, que fica errado sob
            // corrida (cron + sync manual pro mesmo usuário podem ambos ler
            // "não existe" e um deles na verdade cai no ramo de UPDATE).
            wasInsert: sql<boolean>`(xmax = 0)`,
          });

        if (upserted!.wasInsert) {
          result.inserted++;
        } else {
          result.updated++;
        }

        // Ingestão de streams + análise avançada (NP/TSS/zonas/laps): só na
        // primeira vez que vemos a atividade sem streams ainda.
        if (!upserted!.hasStreams) {
          try {
            await ingestIntervalsAnalysis(userId, upserted!.id, discipline, authHeader, externalId);
          } catch (err) {
            console.warn(`[intervals-sync] Falha ao analisar atividade ${externalId}:`, err);
          }
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
