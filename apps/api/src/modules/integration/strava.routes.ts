import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
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
  SyncAcceptedResponse,
  ErrorResponse,
} from './integration.schemas.js';

// ── CSRF State Store (in-memory para MVP) ───────────────────────

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

const PROVIDER = 'strava';

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel de ambiente ${name} nao configurada`);
  return value;
}

function errorPayload(code: string, message: string, status: number): ErrorResponse {
  return { code, message, status };
}

export default async function stravaRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/integrations/strava/connect ────────────────────
  app.get('/api/integrations/strava/connect', { onRequest: authenticate }, async (request, reply) => {
    const clientId = getEnvOrThrow('STRAVA_CLIENT_ID');
    const redirectUri = getEnvOrThrow('STRAVA_REDIRECT_URI');

    const state = randomUUID();
    csrfStore.set(state, { userId: request.userId, createdAt: Date.now() });
    cleanExpiredStates();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read,activity:read_all',
      state,
      approval_prompt: 'auto',
    });

    const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    request.log.info({ provider: PROVIDER }, 'URL de autorizacao Strava gerada');
    return reply.send({ data: { authUrl } } satisfies ConnectResponse);
  });

  // ── GET /api/integrations/strava/callback ───────────────────
  app.get('/api/integrations/strava/callback', async (request, reply) => {
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

    const clientId = getEnvOrThrow('STRAVA_CLIENT_ID');
    const clientSecret = getEnvOrThrow('STRAVA_CLIENT_SECRET');

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId, client_secret: clientSecret,
        code, grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      request.log.error({ status: tokenResponse.status, body: errorBody }, 'Erro token exchange Strava');
      return reply.code(502).send(
        errorPayload('ERR_STRAVA_TOKEN_EXCHANGE', 'Erro ao trocar code por tokens no Strava', 502),
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: { id: number };
    };

    const accessTokenEnc = encrypt(tokenData.access_token);
    const refreshTokenEnc = encrypt(tokenData.refresh_token);
    const expiresAt = new Date(tokenData.expires_at * 1000);
    const externalUserId = String(tokenData.athlete.id);

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
          scope: 'read,activity:read_all', active: true, syncStatus: 'idle',
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
        scope: 'read,activity:read_all', active: true, syncStatus: 'idle',
      });
    }

    request.log.info({ provider: PROVIDER, externalUserId }, 'Integracao Strava salva');

    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    if (!user[0]) {
      return reply.code(404).send(errorPayload('ERR_USER_NOT_FOUND', 'Usuario nao encontrado', 404));
    }

    const tokens = await generateTokens(user[0].id, user[0].email, user[0].role);
    return reply.send({ data: { ...tokens, provider: PROVIDER, externalUserId } });
  });

  // ── GET /api/integrations/strava/status ─────────────────────
  app.get('/api/integrations/strava/status', { onRequest: authenticate }, async (request, reply) => {
    const result = await db.select({
      externalUserId: schema.integrations.externalUserId,
      lastSyncAt: schema.integrations.lastSyncAt,
      syncStatus: schema.integrations.syncStatus,
    }).from(schema.integrations)
      .where(and(
        eq(schema.integrations.userId, request.userId),
        eq(schema.integrations.provider, PROVIDER),
        eq(schema.integrations.active, true),
      ))
      .limit(1);

    const integration = result[0];
    return reply.send({
      data: {
        connected: !!integration, provider: PROVIDER,
        externalUserId: integration?.externalUserId ?? null,
        lastSyncAt: integration?.lastSyncAt?.toISOString() ?? null,
        syncStatus: integration?.syncStatus ?? null,
      },
    } satisfies StatusResponse);
  });

  // ── DELETE /api/integrations/strava/disconnect ──────────────
  app.delete('/api/integrations/strava/disconnect', { onRequest: authenticate }, async (request, reply) => {
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
        errorPayload('ERR_INTEGRATION_NOT_FOUND', 'Integracao Strava nao encontrada', 404),
      );
    }

    request.log.info({ provider: PROVIDER }, 'Integracao Strava desconectada');
    return reply.send({ data: { message: 'Integracao Strava desconectada' } } satisfies DisconnectResponse);
  });

  // ── POST /api/integrations/strava/sync ──────────────────────
  app.post('/api/integrations/strava/sync', { onRequest: authenticate }, async (request, reply) => {
    const result = await db.select({ id: schema.integrations.id })
      .from(schema.integrations)
      .where(and(
        eq(schema.integrations.userId, request.userId),
        eq(schema.integrations.provider, PROVIDER),
        eq(schema.integrations.active, true),
      ))
      .limit(1);

    if (result.length === 0) {
      return reply.code(404).send(
        errorPayload('ERR_INTEGRATION_NOT_FOUND', 'Integracao Strava nao encontrada', 404),
      );
    }

    request.log.info({ provider: PROVIDER }, 'Sync manual solicitado');
    return reply.code(202).send({
      data: { message: 'Sincronizacao agendada', status: 'accepted' },
    } satisfies SyncAcceptedResponse);
  });
}
