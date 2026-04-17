import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '../../lib/encryption.js';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { callbackQuery } from './integration.schemas.js';
import { authenticate } from '../auth/auth.middleware.js';
import { generateTokens } from '../auth/auth.service.js';
import { syncWellnessForUser, getLatestWellness, getWeightHistory } from './wellness-sync.service.js';
import { pullPlannedWorkouts } from './intervals-pull.service.js';
import type {
  ConnectResponse,
  StatusResponse,
  DisconnectResponse,
  ErrorResponse,
} from './integration.schemas.js';

// ── CSRF State Store ────────────────────────────────────────────

interface CsrfEntry {
  userId: string;
  createdAt: number;
}

const csrfStore = new Map<string, CsrfEntry>();
const CSRF_TTL_MS = 5 * 60 * 1000;

function cleanExpiredStates(): void {
  const now = Date.now();
  for (const [key, entry] of csrfStore.entries()) {
    if (now - entry.createdAt > CSRF_TTL_MS) {
      csrfStore.delete(key);
    }
  }
}

const PROVIDER = 'intervals_icu';

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente ${name} nao configurada`);
  }
  return value;
}

function errorPayload(code: string, message: string, status: number): ErrorResponse {
  return { code, message, status };
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

export default async function intervalsRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/integrations/intervals/connect ─────────────────
  // Legacy OAuth connect (kept for compatibility)
  app.get(
    '/api/integrations/intervals/connect',
    { onRequest: authenticate },
    async (request, reply) => {
      return reply.status(400).send(
        errorPayload('ERR_USE_API_KEY', 'Use POST /api/integrations/intervals/connect-apikey com sua API Key do intervals.icu', 400),
      );
    },
  );

  // ── POST /api/integrations/intervals/connect-apikey ────────
  // Conecta via API Key (alternativa ao OAuth, disponível para todos)
  app.post<{ Body: { apiKey: string; athleteId: string } }>(
    '/api/integrations/intervals/connect-apikey',
    { onRequest: authenticate },
    async (request, reply) => {
      const { apiKey, athleteId } = request.body ?? {};
      if (!apiKey || !athleteId) {
        return reply.status(400).send(
          errorPayload('ERR_VALIDATION', 'apiKey e athleteId sao obrigatorios', 400),
        );
      }

      // Validate the API key by making a test request
      try {
        const credentials = Buffer.from(`API_KEY:${apiKey}`).toString('base64');
        const testRes = await fetch(`https://intervals.icu/api/v1/athlete/${athleteId}`, {
          headers: { Authorization: `Basic ${credentials}` },
        });

        if (!testRes.ok) {
          const errorBody = await testRes.text();
          request.log.warn({ status: testRes.status, body: errorBody }, 'API Key intervals.icu invalida');
          return reply.status(401).send(
            errorPayload('ERR_INVALID_API_KEY', 'API Key ou Athlete ID invalido. Verifique em intervals.icu/settings', 401),
          );
        }
      } catch (err) {
        request.log.error(err, 'Erro ao validar API Key intervals.icu');
        return reply.status(502).send(
          errorPayload('ERR_INTERVALS_UNREACHABLE', 'Nao foi possivel conectar ao intervals.icu', 502),
        );
      }

      // Store encrypted API key
      const accessTokenEnc = encrypt(apiKey);

      const existing = await db.select().from(schema.integrations)
        .where(and(
          eq(schema.integrations.userId, request.userId),
          eq(schema.integrations.provider, PROVIDER),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.integrations)
          .set({
            accessTokenEnc,
            refreshTokenEnc: null,
            expiresAt: null,
            externalUserId: athleteId,
            scope: 'API_KEY',
            active: true,
            syncStatus: 'idle',
            updatedAt: new Date(),
          })
          .where(and(
            eq(schema.integrations.userId, request.userId),
            eq(schema.integrations.provider, PROVIDER),
          ));
      } else {
        await db.insert(schema.integrations).values({
          userId: request.userId,
          provider: PROVIDER,
          externalUserId: athleteId,
          accessTokenEnc,
          refreshTokenEnc: null,
          expiresAt: null,
          scope: 'API_KEY',
          active: true,
          syncStatus: 'idle',
        });
      }

      request.log.info({ provider: PROVIDER, athleteId }, 'intervals.icu conectado via API Key');

      // Trigger initial wellness sync
      try {
        const syncResult = await syncWellnessForUser(request.userId);
        return reply.send({ data: { message: 'Conectado com sucesso', synced: syncResult.synced } });
      } catch {
        return reply.send({ data: { message: 'Conectado com sucesso. Sync de wellness sera feito em breve.' } });
      }
    },
  );

  // ── GET /api/integrations/intervals/callback ────────────────
  app.get(
    '/api/integrations/intervals/callback',
    async (request, reply) => {
      const parsed = callbackQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send(
          errorPayload('ERR_INVALID_CALLBACK', 'Parametros de callback invalidos', 400),
        );
      }

      const { code, state } = parsed.data;

      const csrfEntry = csrfStore.get(state);
      if (!csrfEntry || Date.now() - csrfEntry.createdAt > CSRF_TTL_MS) {
        csrfStore.delete(state);
        return reply.code(400).send(
          errorPayload('ERR_INVALID_STATE', 'State CSRF invalido ou expirado', 400),
        );
      }

      const { userId } = csrfEntry;
      csrfStore.delete(state);

      const clientId = getEnvOrThrow('INTERVALS_CLIENT_ID');
      const clientSecret = getEnvOrThrow('INTERVALS_CLIENT_SECRET');

      const tokenResponse = await fetch('https://intervals.icu/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        request.log.error({ status: tokenResponse.status, body: errorBody }, 'Erro token exchange intervals.icu');
        return reply.code(502).send(
          errorPayload('ERR_INTERVALS_TOKEN_EXCHANGE', 'Erro ao trocar code por tokens', 502),
        );
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        athlete_id?: string;
      };

      const accessTokenEnc = encrypt(tokenData.access_token);
      const refreshTokenEnc = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;
      const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
      const externalUserId = tokenData.athlete_id ?? null;

      const existing = await db.select().from(schema.integrations)
        .where(and(
          eq(schema.integrations.userId, userId),
          eq(schema.integrations.provider, PROVIDER),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.integrations)
          .set({
            accessTokenEnc, refreshTokenEnc, expiresAt, externalUserId,
            scope: 'ACTIVITY:READ,WORKOUT:WRITE,WELLNESS:READ', active: true, syncStatus: 'idle',
            updatedAt: new Date(),
          })
          .where(and(
            eq(schema.integrations.userId, userId),
            eq(schema.integrations.provider, PROVIDER),
          ));
      } else {
        await db.insert(schema.integrations).values({
          userId, provider: PROVIDER, externalUserId,
          accessTokenEnc, refreshTokenEnc, expiresAt,
          scope: 'ACTIVITY:READ,WORKOUT:WRITE,WELLNESS:READ', active: true, syncStatus: 'idle',
        });
      }

      request.log.info({ provider: PROVIDER, externalUserId }, 'Integracao intervals.icu salva');

      const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (!user[0]) {
        return reply.code(404).send(errorPayload('ERR_USER_NOT_FOUND', 'Usuario nao encontrado', 404));
      }

      const tokens = await generateTokens(user[0].id, user[0].email, user[0].role);
      return reply.send({ data: { ...tokens, provider: PROVIDER, externalUserId } });
    },
  );

  // ── GET /api/integrations/intervals/status ──────────────────
  app.get(
    '/api/integrations/intervals/status',
    { onRequest: authenticate },
    async (request, reply) => {
      const result = await db
        .select({
          externalUserId: schema.integrations.externalUserId,
          lastSyncAt: schema.integrations.lastSyncAt,
          syncStatus: schema.integrations.syncStatus,
        })
        .from(schema.integrations)
        .where(and(
          eq(schema.integrations.userId, request.userId),
          eq(schema.integrations.provider, PROVIDER),
          eq(schema.integrations.active, true),
        ))
        .limit(1);

      const integration = result[0];
      return reply.send({
        data: {
          connected: !!integration,
          provider: PROVIDER,
          externalUserId: integration?.externalUserId ?? null,
          lastSyncAt: integration?.lastSyncAt?.toISOString() ?? null,
          syncStatus: integration?.syncStatus ?? null,
        },
      } satisfies StatusResponse);
    },
  );

  // ── DELETE /api/integrations/intervals/disconnect ───────────
  app.delete(
    '/api/integrations/intervals/disconnect',
    { onRequest: authenticate },
    async (request, reply) => {
      const result = await db.update(schema.integrations)
        .set({ active: false, updatedAt: new Date() })
        .where(and(
          eq(schema.integrations.userId, request.userId),
          eq(schema.integrations.provider, PROVIDER),
          eq(schema.integrations.active, true),
        ))
        .returning({ id: schema.integrations.id });

      if (result.length === 0) {
        return reply.code(404).send(
          errorPayload('ERR_INTEGRATION_NOT_FOUND', 'Integracao intervals.icu nao encontrada', 404),
        );
      }

      request.log.info({ provider: PROVIDER }, 'Integracao intervals.icu desconectada');
      return reply.send({ data: { message: 'Integracao intervals.icu desconectada' } } satisfies DisconnectResponse);
    },
  );

  // ── POST /api/integrations/intervals/sync-wellness ──────────
  // Sync manual de dados de wellness via intervals.icu
  app.post(
    '/api/integrations/intervals/sync-wellness',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const result = await syncWellnessForUser(request.userId);
        request.log.info({ provider: PROVIDER, ...result }, 'Wellness sync concluido');
        return reply.send({ data: result });
      } catch (err) {
        request.log.error(err, 'Erro no wellness sync');
        return reply.code(500).send(
          errorPayload('ERR_WELLNESS_SYNC', 'Erro ao sincronizar dados de wellness', 500),
        );
      }
    },
  );

  // ── GET /api/integrations/intervals/wellness ───────────────
  // Retorna dados de wellness mais recentes
  app.get(
    '/api/integrations/intervals/wellness',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const wellness = await getLatestWellness(request.userId);
        return reply.send({ data: wellness });
      } catch (err) {
        request.log.error(err, 'Erro ao buscar wellness');
        return reply.code(500).send(
          errorPayload('ERR_WELLNESS_FETCH', 'Erro ao buscar dados de wellness', 500),
        );
      }
    },
  );

  // ── GET /api/integrations/intervals/weight-history ───────────
  app.get<{ Querystring: { days?: string } }>(
    '/api/integrations/intervals/weight-history',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const days = Math.min(365, Math.max(7, Number(request.query.days ?? 90)));
        const history = await getWeightHistory(request.userId, days);

        // Also get profile weight as fallback
        const profile = await db.query.athleteProfiles.findFirst({
          where: eq(schema.athleteProfiles.userId, request.userId),
        });
        const profileWeight = profile?.weightKg ? Number(profile.weightKg) : null;

        return reply.send({
          data: {
            currentWeight: history.length > 0 ? history[history.length - 1]!.weightKg : profileWeight,
            profileWeight,
            history,
          },
        });
      } catch (err) {
        request.log.error(err, 'Erro ao buscar historico de peso');
        return reply.code(500).send(
          errorPayload('ERR_WEIGHT_HISTORY', 'Erro ao buscar historico de peso', 500),
        );
      }
    },
  );

  // ── POST /api/integrations/intervals/pull-workouts ──────────
  // Importa treinos planejados do intervals.icu (category=WORKOUT)
  app.post<{ Querystring: { oldest?: string; newest?: string } }>(
    '/api/integrations/intervals/pull-workouts',
    { onRequest: authenticate },
    async (request, reply) => {
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const today = new Date();
      const defaultNewest = today.toISOString().split('T')[0]!;
      const defaultOldest = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]!;

      const oldest = request.query.oldest ?? defaultOldest;
      const newest = request.query.newest ?? defaultNewest;

      if (!dateRe.test(oldest) || !dateRe.test(newest)) {
        return reply.code(400).send(
          errorPayload('ERR_INVALID_DATE', 'oldest e newest devem estar no formato YYYY-MM-DD', 400),
        );
      }
      if (oldest > newest) {
        return reply.code(400).send(
          errorPayload('ERR_INVALID_RANGE', 'oldest deve ser menor ou igual a newest', 400),
        );
      }

      try {
        const result = await pullPlannedWorkouts(request.userId, oldest, newest);
        request.log.info({ provider: PROVIDER, ...result }, 'Pull de planned workouts concluido');
        return reply.send({ data: result });
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err) {
          const e = err as { code: string; message: string; status: number };
          return reply.code(e.status).send(errorPayload(e.code, e.message, e.status));
        }
        request.log.error(err, 'Erro no pull de planned workouts');
        return reply.code(500).send(
          errorPayload('ERR_PULL_WORKOUTS', 'Erro ao importar treinos do intervals.icu', 500),
        );
      }
    },
  );

  // ── POST /api/integrations/intervals/webhook ────────────────
  app.post(
    '/api/integrations/intervals/webhook',
    async (request, reply) => {
      const webhookSecret = getEnvOrThrow('INTERVALS_WEBHOOK_SECRET');
      const signature = request.headers['x-intervals-signature'] as string | undefined;

      if (!signature) {
        return reply.code(401).send(
          errorPayload('ERR_WEBHOOK_NO_SIGNATURE', 'Assinatura HMAC ausente', 401),
        );
      }

      const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return reply.code(401).send(
          errorPayload('ERR_WEBHOOK_INVALID_SIGNATURE', 'Assinatura HMAC invalida', 401),
        );
      }

      const event = request.body as { type?: string; athlete_id?: string };
      request.log.info({ provider: PROVIDER, eventType: event.type }, 'Webhook intervals.icu recebido');

      return reply.code(200).send({ ok: true });
    },
  );
}
