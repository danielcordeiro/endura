import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { analyzeActivity, type StreamData, type LapInput, type Discipline } from '../activity/activity-analytics.js';

// ── Constantes ──────────────────────────────────────────────────

const PROVIDER = 'strava';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

/** Limite de taxa do Strava: max 80 requests por janela de 15 minutos */
const RATE_LIMIT_MAX_REQUESTS = 80;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Maximo de tentativas em caso de erro 5xx */
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/** Maximo de atividades por pagina na API do Strava */
const STRAVA_PER_PAGE = 50;

// ── Rate limiter simples (in-memory) ────────────────────────────

let requestTimestamps: number[] = [];

function canMakeRequest(): boolean {
  const now = Date.now();
  // Remove timestamps fora da janela
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  return requestTimestamps.length < RATE_LIMIT_MAX_REQUESTS;
}

function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

function getWaitTimeMs(): number {
  if (requestTimestamps.length === 0) return 0;
  const oldest = requestTimestamps[0];
  if (!oldest) return 0;
  const elapsed = Date.now() - oldest;
  return Math.max(0, RATE_LIMIT_WINDOW_MS - elapsed + 100);
}

// ── Utilitarios ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel de ambiente ${name} nao configurada`);
  return value;
}

// ── Mapeamento de sport_type do Strava para nossas disciplinas ──

const SPORT_TYPE_MAP: Record<string, string> = {
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  Ride: 'bike',
  VirtualRide: 'bike',
  GravelRide: 'bike',
  MountainBikeRide: 'bike',
  EBikeRide: 'bike',
  Swim: 'swim',
  // Atividades não-triathlon são mapeadas como 'other'
};

function mapSportType(sportType: string): string {
  return SPORT_TYPE_MAP[sportType] ?? 'other';
}

// ── Tipos para a resposta da API do Strava ──────────────────────

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  moving_time?: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  total_elevation_gain?: number;
  calories?: number;
  start_latlng?: [number, number];
  perceived_exertion?: number;
}

interface StravaDetailedActivity extends StravaActivity {
  calories: number;
  description?: string;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface StravaStreamSet {
  time?: { data: number[] };
  heartrate?: { data: number[] };
  watts?: { data: number[] };
  cadence?: { data: number[] };
  distance?: { data: number[] };
  altitude?: { data: number[] };
  velocity_smooth?: { data: number[] };
  grade_smooth?: { data: number[] };
  moving?: { data: boolean[] };
  temp?: { data: number[] };
}

interface StravaLapRaw {
  lap_index?: number;
  start_index?: number;
  end_index?: number;
  name?: string;
}

/** Disciplinas com análise avançada (streams + laps + NP/TSS/zonas). */
const ANALYZABLE_DISCIPLINES = new Set(['bike', 'run']);
const STREAM_KEYS = 'time,heartrate,watts,cadence,distance,altitude,velocity_smooth,grade_smooth,moving,temp';

// ── Fetch com retry e backoff exponencial ──────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Aguarda rate limit se necessário
    while (!canMakeRequest()) {
      const waitMs = getWaitTimeMs();
      console.log(`[strava-sync] Rate limit atingido, aguardando ${waitMs}ms`);
      await sleep(waitMs);
    }

    recordRequest();
    const response = await fetch(url, options);

    // Se não é erro 5xx ou é a última tentativa, retorna
    if (response.status < 500 || attempt === retries) {
      return response;
    }

    // Backoff exponencial para erros 5xx
    const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
    console.log(
      `[strava-sync] Erro ${response.status}, tentativa ${attempt + 1}/${retries}. Aguardando ${backoff}ms`,
    );
    await sleep(backoff);
  }

  // Nunca deveria chegar aqui, mas garante o tipo
  throw new Error('Falha apos todas as tentativas de retry');
}

// ── Refresh de token ───────────────────────────────────────────

export async function refreshStravaToken(
  integration: typeof schema.integrations.$inferSelect,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientId = getEnvOrThrow('STRAVA_CLIENT_ID');
  const clientSecret = getEnvOrThrow('STRAVA_CLIENT_SECRET');

  if (!integration.refreshTokenEnc) {
    throw new Error('Refresh token nao disponivel para esta integracao');
  }

  const currentRefreshToken = decrypt(integration.refreshTokenEnc);

  const response = await fetchWithRetry(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: currentRefreshToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw {
      code: 'ERR_STRAVA_TOKEN_REFRESH',
      message: `Falha ao renovar token Strava: ${response.status} - ${errorBody}`,
      status: 502,
    };
  }

  const data = (await response.json()) as StravaTokenResponse;

  const newAccessTokenEnc = encrypt(data.access_token);
  const newRefreshTokenEnc = encrypt(data.refresh_token);
  const newExpiresAt = new Date(data.expires_at * 1000);

  // Persiste novos tokens criptografados
  await db
    .update(schema.integrations)
    .set({
      accessTokenEnc: newAccessTokenEnc,
      refreshTokenEnc: newRefreshTokenEnc,
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.integrations.id, integration.id));

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: newExpiresAt,
  };
}

// ── Obter access token valido ──────────────────────────────────

export async function getValidAccessToken(
  integration: typeof schema.integrations.$inferSelect,
): Promise<string> {
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutos de margem

  // Verifica se o token expirou (ou vai expirar em breve)
  if (integration.expiresAt && integration.expiresAt.getTime() - bufferMs > now.getTime()) {
    return decrypt(integration.accessTokenEnc);
  }

  // Token expirado, faz refresh
  const refreshed = await refreshStravaToken(integration);
  return refreshed.accessToken;
}

// ── Ingestão de streams/laps + análise avançada (NP/TSS/zonas) ──
// Chamado por atividade nova (ou sem streams ainda) de bike/run. Busca as
// séries temporais e os laps do Strava, roda o motor de análise
// (activity-analytics.ts) e persiste em activity_streams + activities
// (analysis jsonb, tss denormalizado, hasStreams). Falha isolada (não
// derruba o sync das outras atividades) — chamado dentro de try/catch.
export async function ingestActivityAnalysis(
  userId: string,
  activityId: string,
  discipline: string,
  accessToken: string,
  stravaActivityId: number,
): Promise<void> {
  if (!ANALYZABLE_DISCIPLINES.has(discipline)) return;

  const streamsUrl = `${STRAVA_API_BASE}/activities/${stravaActivityId}/streams?keys=${STREAM_KEYS}&key_by_type=true`;
  const streamsRes = await fetchWithRetry(streamsUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!streamsRes.ok) {
    if (streamsRes.status === 404) return; // atividade manual, sem streams
    throw new Error(`Falha ao buscar streams: ${streamsRes.status}`);
  }
  const rawStreams = (await streamsRes.json()) as StravaStreamSet;
  const timeSec = rawStreams.time?.data;
  // Gate por DURAÇÃO (não por nº de amostras — "smart recording" pode ter
  // poucos pontos numa atividade longa e estável, isso não é "dado insuficiente").
  const elapsedSec = timeSec && timeSec.length > 0 ? timeSec[timeSec.length - 1]! : 0;
  if (!timeSec || timeSec.length < 2 || elapsedSec < 60) return;

  const lapsUrl = `${STRAVA_API_BASE}/activities/${stravaActivityId}/laps`;
  const lapsRes = await fetchWithRetry(lapsUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const rawLaps = lapsRes.ok ? ((await lapsRes.json()) as StravaLapRaw[]) : [];

  const streamData: StreamData = {
    timeSec,
    watts: rawStreams.watts?.data ?? null,
    heartRate: rawStreams.heartrate?.data ?? null,
    cadence: rawStreams.cadence?.data ?? null,
    distanceM: rawStreams.distance?.data ?? null,
    altitudeM: rawStreams.altitude?.data ?? null,
    velocityMs: rawStreams.velocity_smooth?.data ?? null,
    gradePct: rawStreams.grade_smooth?.data ?? null,
    moving: rawStreams.moving?.data ?? null,
    tempC: rawStreams.temp?.data ?? null,
  };

  // Converte start_index/end_index (índice bruto na stream nativa do Strava)
  // pra segundos decorridos AQUI — clamp simétrico nos dois lados porque o
  // Strava pode mandar índices fora dos limites (laps editados/mesclados);
  // sem o clamp no start, um índice inválido virava silenciosamente "começa
  // do zero" (timeSec[idx] undefined).
  const laps: LapInput[] = (Array.isArray(rawLaps) ? rawLaps : []).map((l, i) => {
    const rawStart = Math.max(0, Math.min(l.start_index ?? 0, timeSec.length - 1));
    const rawEnd = Math.max(0, Math.min(l.end_index ?? timeSec.length - 1, timeSec.length - 1));
    return {
      lapIndex: l.lap_index ?? i + 1,
      startOffsetSec: Math.floor(timeSec[rawStart] ?? 0),
      endOffsetSec: Math.floor(timeSec[rawEnd] ?? 0),
      name: l.name ?? null,
    };
  });

  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });
  const ctx = {
    ftpWatts: profile?.ftpWatts ?? null,
    maxHr: profile?.maxHr ?? null,
    weightKg: profile?.weightKg ? Number(profile.weightKg) : null,
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
    moving: streamData.moving,
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
      updatedAt: new Date(),
    })
    .where(eq(schema.activities.id, activityId));
}

// ── Sincronizar atividades de um usuario ───────────────────────

export async function syncUserActivities(userId: string): Promise<number> {
  const startTime = Date.now();
  const correlationId = randomUUID();

  try {
    // 1. Busca integracao Strava ativa do usuario
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(schema.integrations.userId, userId),
        eq(schema.integrations.provider, PROVIDER),
        eq(schema.integrations.active, true),
      ),
    });

    if (!integration) {
      throw {
        code: 'ERR_STRAVA_NOT_CONNECTED',
        message: 'Integracao Strava nao encontrada ou inativa',
        status: 404,
      };
    }

    // 2. Atualiza status de sincronizacao
    await db
      .update(schema.integrations)
      .set({ syncStatus: 'syncing', updatedAt: new Date() })
      .where(eq(schema.integrations.id, integration.id));

    // 3. Obtem token valido (faz refresh se necessario)
    const accessToken = await getValidAccessToken(integration);

    // 4. Calcula timestamp de referencia
    // Sempre busca pelo menos 48h para tras (pega atividades recentes e uploads tardios)
    const lastSync = integration.lastSyncAt;
    const defaultAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const minLookback = new Date(Date.now() - 48 * 60 * 60 * 1000); // Mínimo 48h
    let afterDate = lastSync ?? defaultAfter;
    if (afterDate > minLookback) {
      afterDate = minLookback; // Garante pelo menos 48h de lookback
    }
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
    console.log(`[strava-sync] lastSyncAt=${lastSync?.toISOString() ?? 'null'}, afterDate=${afterDate.toISOString()}, afterTimestamp=${afterTimestamp}`);

    // 5. Busca atividades do Strava (com paginação)
    const stravaActivities: StravaActivity[] = [];
    let page = 1;
    const MAX_PAGES = 20; // Limite de segurança (~1000 atividades)

    while (page <= MAX_PAGES) {
      const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterTimestamp}&per_page=${STRAVA_PER_PAGE}&page=${page}`;

      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw {
          code: 'ERR_STRAVA_API',
          message: `Erro na API Strava: ${response.status} - ${errorBody}`,
          status: 502,
        };
      }

      const pageActivities = (await response.json()) as StravaActivity[];
      stravaActivities.push(...pageActivities);

      console.log(
        `[strava-sync] Pagina ${page}: ${pageActivities.length} atividades buscadas`,
      );

      // Se retornou menos que o máximo, não há mais páginas
      if (pageActivities.length < STRAVA_PER_PAGE) break;
      page++;
    }

    // 6. Mapeia e faz upsert das atividades
    //    Busca detalhe de cada atividade para obter calories (nao vem no SummaryActivity)
    let syncedCount = 0;

    for (const sa of stravaActivities) {
      const externalId = String(sa.id);
      const discipline = mapSportType(sa.sport_type);

      // Verifica se já existe (deduplicacao por usuario + external_id + source —
      // SEM o userId aqui, duas contas Endura ligadas ao mesmo atleta Strava
      // reatribuiriam silenciosamente a atividade uma da outra a cada sync)
      const existing = await db.query.activities.findFirst({
        where: and(
          eq(schema.activities.userId, userId),
          eq(schema.activities.externalId, externalId),
          eq(schema.activities.source, PROVIDER),
        ),
      });

      // Busca detalhe da atividade para obter calories
      // (SummaryActivity do /athlete/activities nao inclui calories)
      let calories: number | null = sa.calories ? Math.round(sa.calories) : null;
      if (calories == null) {
        try {
          const detailUrl = `${STRAVA_API_BASE}/activities/${sa.id}`;
          const detailRes = await fetchWithRetry(detailUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as StravaDetailedActivity;
            calories = detail.calories ? Math.round(detail.calories) : null;
          }
        } catch (err) {
          console.warn(`[strava-sync] Falha ao buscar detalhe da atividade ${sa.id}:`, err);
        }
      }

      const activityData = {
        userId,
        externalId,
        source: PROVIDER,
        discipline,
        title: sa.name,
        startedAt: new Date(sa.start_date),
        durationSec: sa.elapsed_time,
        movingTimeSec: sa.moving_time ?? null,
        distanceM: sa.distance != null ? String(sa.distance) : null,
        avgHr: sa.average_heartrate != null ? Math.round(sa.average_heartrate) : null,
        maxHr: sa.max_heartrate != null ? Math.round(sa.max_heartrate) : null,
        avgPowerW: sa.average_watts != null ? Math.round(sa.average_watts) : null,
        // total_elevation_gain e legitimamente 0 (indoor/pista/esteira) — checar
        // truthy descartava esse valor real e gravava null ("sem dado").
        elevationM: sa.total_elevation_gain != null ? String(sa.total_elevation_gain) : null,
        calories,
        latStart: sa.start_latlng?.[0] != null ? String(sa.start_latlng[0]) : null,
        lonStart: sa.start_latlng?.[1] != null ? String(sa.start_latlng[1]) : null,
        perceivedEffort: sa.perceived_exertion != null ? Math.round(sa.perceived_exertion) : null,
        rawData: sa as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      };

      // Upsert atômico (insert ... on conflict do update) sobre o índice único
      // (user_id, external_id, source) — o antigo check-then-insert deixava uma
      // janela de corrida entre o cron (a cada 2h) e um sync manual concorrente
      // pro mesmo usuário criarem DUAS linhas pra mesma atividade real.
      const [upserted] = await db
        .insert(schema.activities)
        .values({ ...activityData, createdAt: new Date() })
        .onConflictDoUpdate({
          target: [schema.activities.userId, schema.activities.externalId, schema.activities.source],
          set: activityData,
        })
        .returning({ id: schema.activities.id });
      const activityId = upserted!.id;

      // Ingestão de streams/laps + análise avançada (NP/TSS/zonas): só na
      // primeira vez que vemos a atividade com streams ainda não puxadas —
      // evita rebuscar da API do Strava a cada sync (janela de 48h se repete).
      if (!existing?.hasStreams) {
        try {
          await ingestActivityAnalysis(userId, activityId, discipline, accessToken, sa.id);
        } catch (err) {
          console.warn(`[strava-sync] Falha ao analisar atividade ${sa.id}:`, err);
        }
      }

      syncedCount++;
    }

    // 7. Atualiza last_sync_at e sync_status
    await db
      .update(schema.integrations)
      .set({
        lastSyncAt: new Date(),
        syncStatus: 'idle',
        updatedAt: new Date(),
      })
      .where(eq(schema.integrations.id, integration.id));

    // 8. Registra log de sincronizacao (sucesso)
    const durationMs = Date.now() - startTime;
    await db.insert(schema.syncLogs).values({
      userId,
      provider: PROVIDER,
      correlationId,
      outcome: 'success',
      activitiesSynced: syncedCount,
      durationMs,
    });

    console.log(
      `[strava-sync] Usuario ${userId}: ${syncedCount} atividades sincronizadas em ${durationMs}ms`,
    );

    return syncedCount;
  } catch (err) {
    // Registra log de sincronizacao (erro)
    const durationMs = Date.now() - startTime;
    const errorDetails =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Erro desconhecido';

    await db.insert(schema.syncLogs).values({
      userId,
      provider: PROVIDER,
      correlationId,
      outcome: 'error',
      activitiesSynced: 0,
      errorDetails,
      durationMs,
    });

    // Atualiza status para erro
    await db
      .update(schema.integrations)
      .set({ syncStatus: 'error', updatedAt: new Date() })
      .where(
        and(
          eq(schema.integrations.userId, userId),
          eq(schema.integrations.provider, PROVIDER),
        ),
      );

    console.error(`[strava-sync] Erro para usuario ${userId}:`, errorDetails);
    throw err;
  }
}

// ── Sincronizar todos os usuarios com integracao Strava ativa ──

export async function syncAllUsers(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  const activeIntegrations = await db
    .select({
      userId: schema.integrations.userId,
    })
    .from(schema.integrations)
    .where(
      and(
        eq(schema.integrations.provider, PROVIDER),
        eq(schema.integrations.active, true),
      ),
    );

  console.log(
    `[strava-sync] Iniciando sync para ${activeIntegrations.length} usuarios`,
  );

  let succeeded = 0;
  let failed = 0;

  for (const integration of activeIntegrations) {
    try {
      await syncUserActivities(integration.userId);
      succeeded++;
    } catch {
      // Erro ja logado e registrado em syncUserActivities
      failed++;
    }
  }

  console.log(
    `[strava-sync] Sync concluido: ${succeeded} sucesso, ${failed} falhas, ${activeIntegrations.length} total`,
  );

  return {
    total: activeIntegrations.length,
    succeeded,
    failed,
  };
}
