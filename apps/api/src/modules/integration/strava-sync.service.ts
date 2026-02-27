import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { encrypt, decrypt } from '../../lib/encryption.js';

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

async function getValidAccessToken(
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

    // 4. Calcula timestamp de referencia (ultima sync ou 90 dias atras)
    const lastSync = integration.lastSyncAt;
    const defaultAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const afterDate = lastSync ?? defaultAfter;
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

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

      // Verifica se já existe (deduplicacao por external_id + source)
      const existing = await db.query.activities.findFirst({
        where: and(
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
        distanceM: sa.distance ? String(sa.distance) : null,
        avgHr: sa.average_heartrate ? Math.round(sa.average_heartrate) : null,
        maxHr: sa.max_heartrate ? Math.round(sa.max_heartrate) : null,
        avgPowerW: sa.average_watts ? Math.round(sa.average_watts) : null,
        elevationM: sa.total_elevation_gain ? String(sa.total_elevation_gain) : null,
        calories,
        latStart: sa.start_latlng?.[0] != null ? String(sa.start_latlng[0]) : null,
        lonStart: sa.start_latlng?.[1] != null ? String(sa.start_latlng[1]) : null,
        perceivedEffort: sa.perceived_exertion ? Math.round(sa.perceived_exertion) : null,
        rawData: sa as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      };

      if (existing) {
        // Atualiza atividade existente
        await db
          .update(schema.activities)
          .set(activityData)
          .where(eq(schema.activities.id, existing.id));
      } else {
        // Insere nova atividade
        await db.insert(schema.activities).values({
          ...activityData,
          createdAt: new Date(),
        });
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
