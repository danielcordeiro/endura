import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '../../lib/encryption.js';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { callbackQuery } from './integration.schemas.js';
import { authenticate } from '../auth/auth.middleware.js';
import { generateTokens } from '../auth/auth.service.js';
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
  app.get(
    '/api/integrations/intervals/connect',
    { onRequest: authenticate },
    async (request, reply) => {
      const clientId = getEnvOrThrow('INTERVALS_CLIENT_ID');
      const redirectUri = getEnvOrThrow('INTERVALS_REDIRECT_URI');

      const state = randomUUID();
      csrfStore.set(state, { userId: request.userId, createdAt: Date.now() });
      cleanExpiredStates();

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'ACTIVITY:READ,WORKOUT:WRITE',
        state,
      });

      const authUrl = `https://intervals.icu/oauth/authorize?${params.toString()}`;
      request.log.info({ provider: PROVIDER }, 'URL de autorizacao intervals.icu gerada');
      return reply.send({ data: { authUrl } } satisfies ConnectResponse);
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
            scope: 'ACTIVITY:READ,WORKOUT:WRITE', active: true, syncStatus: 'idle',
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
          scope: 'ACTIVITY:READ,WORKOUT:WRITE', active: true, syncStatus: 'idle',
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
