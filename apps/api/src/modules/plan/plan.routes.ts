import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { chatBody, weekParams, workoutParams } from './plan.schemas.js';
import * as planService from './plan.service.js';

// ── Tipos de erro da aplicacao ──────────────────────────────────

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
  request.log.error(err, 'Erro inesperado no modulo plan');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ─────────────────────────────────────────────

export default async function planRoutes(app: FastifyInstance): Promise<void> {

  // ── POST /api/plan/generate ─────────────────────────────────
  // Gera um plano de treino completo via IA
  app.post('/api/plan/generate', { onRequest: authenticate }, async (request, reply) => {
    try {
      const result = await planService.generatePlan(request.userId);
      request.log.info(
        { userId: request.userId, planId: result.plan.id, totalWorkouts: result.totalWorkouts },
        'Plano de treino gerado com sucesso',
      );
      return reply.status(201).send({ data: result });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/plan ───────────────────────────────────────────
  // Retorna o plano ativo com treinos da semana atual
  app.get('/api/plan', { onRequest: authenticate }, async (request, reply) => {
    try {
      const result = await planService.getActivePlan(request.userId);
      return reply.send({ data: result });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/plan/week/current ──────────────────────────────
  // Treinos planejados da semana atual (inclui importados sem plano)
  app.get('/api/plan/week/current', { onRequest: authenticate }, async (request, reply) => {
    try {
      const result = await planService.getCurrentWeekAllWorkouts(request.userId);
      return reply.send(result);
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/plan/week/:weekNumber ──────────────────────────
  // Retorna os treinos de uma semana especifica
  app.get('/api/plan/week/:weekNumber', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = weekParams.safeParse(request.params);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametro invalido',
          status: 400,
        });
      }

      const result = await planService.getPlanWeek(request.userId, parsed.data.weekNumber);
      // Mesmo envelope do /week/current (sem `data`) — a tela de treino usa os dois.
      return reply.send(result);
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/plan/workout/:id ───────────────────────────────
  // Retorna detalhes de um treino com protocolo nutricional
  app.get('/api/plan/workout/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = workoutParams.safeParse(request.params);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametro invalido',
          status: 400,
        });
      }

      const result = await planService.getWorkout(request.userId, parsed.data.id);
      return reply.send({ data: result });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/plan/chat ─────────────────────────────────────
  // Chat para adaptar o plano de treino via IA
  app.post('/api/plan/chat', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = chatBody.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const result = await planService.chatAdaptPlan(request.userId, parsed.data.message);
      request.log.info(
        { userId: request.userId, adaptations: result.adaptationsApplied },
        'Chat de adaptacao do plano processado',
      );
      return reply.send({ data: result });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
