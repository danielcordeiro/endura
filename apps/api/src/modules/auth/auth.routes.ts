import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerBody, loginBody, refreshBody } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { authenticate } from './auth.middleware.js';

interface AppError {
  code: string;
  message: string;
  status: number;
}

function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    'status' in err
  );
}

async function handleAuthError(
  err: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (isAppError(err)) {
    request.log.warn({ code: err.code }, err.message);
    reply.status(err.status).send({
      code: err.code,
      message: err.message,
      status: err.status,
    });
    return;
  }

  request.log.error(err, 'Erro inesperado no modulo de autenticacao');
  reply.status(500).send({
    code: 'ERR_INTERNAL',
    message: 'Erro interno do servidor',
    status: 500,
  });
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/auth/register ─────────────────────────────────
  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = registerBody.safeParse(request.body);

      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
        return;
      }

      const { email, password, name } = parsed.data;
      const result = await authService.register(email, password, name);

      request.log.info({ userId: result.user.id }, 'Usuario registrado com sucesso');

      reply.status(201).send({ data: result });
    } catch (err) {
      await handleAuthError(err, request, reply);
    }
  });

  // ── POST /api/auth/login ────────────────────────────────────
  app.post('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginBody.safeParse(request.body);

      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
        return;
      }

      const { email, password } = parsed.data;
      const result = await authService.login(email, password);

      request.log.info({ userId: result.user.id }, 'Login realizado com sucesso');

      reply.status(200).send({ data: result });
    } catch (err) {
      await handleAuthError(err, request, reply);
    }
  });

  // ── POST /api/auth/refresh ──────────────────────────────────
  app.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = refreshBody.safeParse(request.body);

      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
        return;
      }

      const { refreshToken } = parsed.data;
      const result = await authService.refreshToken(refreshToken);

      request.log.info({ userId: result.user.id }, 'Token renovado com sucesso');

      reply.status(200).send({ data: result });
    } catch (err) {
      await handleAuthError(err, request, reply);
    }
  });

  // ── POST /api/auth/logout ───────────────────────────────────
  app.post('/api/auth/logout', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await authService.logout(request.userId);

      request.log.info({ userId: request.userId }, 'Logout realizado com sucesso');

      reply.status(200).send({
        data: { message: 'Logout realizado com sucesso' },
      });
    } catch (err) {
      await handleAuthError(err, request, reply);
    }
  });

  // ── PUT /api/auth/set-password ─────────────────────────────────
  // Permite definir/alterar senha (para usuarios que entraram via Strava)
  app.put<{ Body: { currentPassword?: string; newPassword: string } }>(
    '/api/auth/set-password',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const { currentPassword, newPassword } = request.body ?? {};
        if (!newPassword || newPassword.length < 6) {
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: 'Nova senha deve ter no minimo 6 caracteres',
            status: 400,
          });
        }

        await authService.setPassword(request.userId, newPassword, currentPassword ?? null);
        request.log.info({ userId: request.userId }, 'Senha definida/alterada');
        return reply.send({ data: { message: 'Senha definida com sucesso' } });
      } catch (err) {
        await handleAuthError(err, request, reply);
      }
    },
  );

  // ── GET /api/auth/has-password ─────────────────────────────────
  // Verifica se o usuario tem senha definida
  app.get('/api/auth/has-password', { onRequest: authenticate }, async (request, reply) => {
    try {
      const hasPassword = await authService.hasPassword(request.userId);
      return reply.send({ data: { hasPassword } });
    } catch (err) {
      await handleAuthError(err, request, reply);
    }
  });
}
