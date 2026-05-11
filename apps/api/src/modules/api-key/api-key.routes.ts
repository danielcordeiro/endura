import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware.js';
import { createApiKey, listApiKeys, revokeApiKey } from './api-key.service.js';
import { ALL_SCOPES, normalizeScopes, type Scope } from './scopes.js';

const createBody = z.object({
  name: z.string().min(1, 'name obrigatorio').max(100),
  scopes: z.array(z.enum(ALL_SCOPES)).optional(),
  expiresInDays: z.number().int().positive().max(3650).nullable().optional(),
});

const idParams = z.object({
  id: z.string().uuid(),
});

interface AppError {
  code: string;
  message: string;
  status: number;
}

function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && 'code' in err && 'status' in err;
}

export default async function apiKeyRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/auth/api-keys ─────────────────────────────────
  app.post(
    '/api/auth/api-keys',
    { onRequest: authenticate },
    async (request, reply) => {
      const parsed = createBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: parsed.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      try {
        const scopes = parsed.data.scopes
          ? normalizeScopes(parsed.data.scopes) as Scope[]
          : undefined;
        const result = await createApiKey(request.userId, {
          name: parsed.data.name,
          scopes,
          expiresInDays: parsed.data.expiresInDays ?? null,
        });
        request.log.info(
          { userId: request.userId, keyId: result.id, scopes: result.scopes },
          'API Key criada',
        );
        return reply.code(201).send({ data: result });
      } catch (err) {
        if (isAppError(err)) {
          return reply.code(err.status).send(err);
        }
        request.log.error(err, 'Erro ao criar API Key');
        return reply.code(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno', status: 500 });
      }
    },
  );

  // ── GET /api/auth/api-keys ──────────────────────────────────
  app.get(
    '/api/auth/api-keys',
    { onRequest: authenticate },
    async (request, reply) => {
      const items = await listApiKeys(request.userId);
      return reply.send({ data: items });
    },
  );

  // ── GET /api/auth/api-keys/scopes ───────────────────────────
  // Catalogo de scopes disponiveis (usado pela UI para montar checkboxes)
  app.get(
    '/api/auth/api-keys/scopes',
    { onRequest: authenticate },
    async (_request, reply) => {
      return reply.send({
        data: {
          scopes: ALL_SCOPES,
          bundles: {
            coach: ['read:profile', 'read:activities', 'read:planned', 'read:wellness', 'read:catalog', 'write:nutrition', 'write:checkin', 'write:comments'],
            readOnly: ['read:profile', 'read:activities', 'read:planned', 'read:wellness', 'read:catalog'],
          },
        },
      });
    },
  );

  // ── DELETE /api/auth/api-keys/:id ───────────────────────────
  app.delete<{ Params: { id: string } }>(
    '/api/auth/api-keys/:id',
    { onRequest: authenticate },
    async (request, reply) => {
      const parsed = idParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          code: 'ERR_VALIDATION',
          message: 'ID invalido',
          status: 400,
        });
      }

      try {
        await revokeApiKey(request.userId, parsed.data.id);
        return reply.send({ data: { message: 'API Key revogada' } });
      } catch (err) {
        if (isAppError(err)) {
          return reply.code(err.status).send(err);
        }
        request.log.error(err, 'Erro ao revogar API Key');
        return reply.code(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno', status: 500 });
      }
    },
  );
}
