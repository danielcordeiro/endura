import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import {
  planIdParams,
  simulateBody,
  updatePlanBody,
  testPlanParams,
} from './race-nutrition.schemas.js';
import * as raceNutritionService from './race-nutrition.service.js';

// ── Tratamento de erros padrao ────────────────────────────────────

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
  request.log.error(err, 'Erro inesperado no modulo race-nutrition');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ───────────────────────────────────────────────

export default async function raceNutritionRoutes(app: FastifyInstance): Promise<void> {

  // ── POST /api/race-nutrition/simulate ────────────────────────────
  // Gera simulacao de nutricao race day via IA
  app.post('/api/race-nutrition/simulate', { onRequest: authenticate }, async (request, reply) => {
    try {
      const bodyParsed = simulateBody.safeParse(request.body);
      if (!bodyParsed.success) {
        const firstError = bodyParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const plan = await raceNutritionService.simulate(request.userId, bodyParsed.data);

      request.log.info(
        { userId: request.userId, planId: plan.id },
        'Simulacao de nutricao race day gerada',
      );
      return reply.status(201).send({ data: plan });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/race-nutrition/plans ───────────────────────────────
  // Lista todos os planos de nutricao race day do usuario
  app.get('/api/race-nutrition/plans', { onRequest: authenticate }, async (request, reply) => {
    try {
      const plans = await raceNutritionService.listPlans(request.userId);
      return reply.send({ data: plans });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/race-nutrition/plans/:id ──────────────────────────
  // Retorna um plano especifico
  app.get('/api/race-nutrition/plans/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = planIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const plan = await raceNutritionService.getPlan(request.userId, paramsParsed.data.id);
      return reply.send({ data: plan });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── PUT /api/race-nutrition/plans/:id ──────────────────────────
  // Atualiza um plano (nome, status, conteudo)
  app.put('/api/race-nutrition/plans/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = planIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const bodyParsed = updatePlanBody.safeParse(request.body);
      if (!bodyParsed.success) {
        const firstError = bodyParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const plan = await raceNutritionService.updatePlan(
        request.userId,
        paramsParsed.data.id,
        bodyParsed.data,
      );

      request.log.info(
        { userId: request.userId, planId: paramsParsed.data.id },
        'Plano de nutricao race day atualizado',
      );
      return reply.send({ data: plan });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── DELETE /api/race-nutrition/plans/:id ───────────────────────
  // Remove um plano de nutricao race day
  app.delete('/api/race-nutrition/plans/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = planIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      await raceNutritionService.deletePlan(request.userId, paramsParsed.data.id);

      request.log.info(
        { userId: request.userId, planId: paramsParsed.data.id },
        'Plano de nutricao race day removido',
      );
      return reply.status(204).send();
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/race-nutrition/plans/:id/test/:activityId ───────
  // Marca um plano como testado vinculando a uma atividade
  app.post('/api/race-nutrition/plans/:id/test/:activityId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = testPlanParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const plan = await raceNutritionService.markTested(
        request.userId,
        paramsParsed.data.id,
        paramsParsed.data.activityId,
      );

      request.log.info(
        { userId: request.userId, planId: paramsParsed.data.id, activityId: paramsParsed.data.activityId },
        'Plano de nutricao race day marcado como testado',
      );
      return reply.send({ data: plan });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
