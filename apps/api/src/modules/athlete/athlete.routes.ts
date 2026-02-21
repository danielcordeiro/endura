import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { createProfileBody, updateProfileBody, createRaceGoalBody } from './athlete.schemas.js';
import * as athleteService from './athlete.service.js';

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

async function handleError(err: unknown, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (isAppError(err)) {
    request.log.warn({ code: err.code }, err.message);
    reply.status(err.status).send({ code: err.code, message: err.message, status: err.status });
    return;
  }
  request.log.error(err, 'Erro inesperado no modulo athlete');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

export default async function athleteRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/athlete/profile ───────────────────────────────
  app.post('/api/athlete/profile', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = createProfileBody.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const profile = await athleteService.createProfile(request.userId, parsed.data);
      request.log.info({ userId: request.userId }, 'Perfil atletico salvo');
      return reply.status(201).send({ data: profile });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/athlete/profile ────────────────────────────────
  app.get('/api/athlete/profile', { onRequest: authenticate }, async (request, reply) => {
    try {
      const profile = await athleteService.getProfile(request.userId);
      return reply.send({ data: profile });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── PUT /api/athlete/profile ────────────────────────────────
  app.put('/api/athlete/profile', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = updateProfileBody.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const profile = await athleteService.updateProfile(request.userId, parsed.data);
      request.log.info({ userId: request.userId }, 'Perfil atletico atualizado');
      return reply.send({ data: profile });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/athlete/race-goal ─────────────────────────────
  app.post('/api/athlete/race-goal', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = createRaceGoalBody.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const goal = await athleteService.createRaceGoal(request.userId, parsed.data);
      request.log.info({ userId: request.userId, goalId: goal?.id }, 'Prova alvo definida');
      return reply.status(201).send({ data: goal });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/athlete/race-goal ──────────────────────────────
  app.get('/api/athlete/race-goal', { onRequest: authenticate }, async (request, reply) => {
    try {
      const goal = await athleteService.getActiveRaceGoal(request.userId);
      return reply.send({ data: goal });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
