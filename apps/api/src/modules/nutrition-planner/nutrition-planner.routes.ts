import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import {
  workoutIdParams,
  protocolIdParams,
  customizeProtocolBody,
} from './nutrition-planner.schemas.js';
import * as plannerService from './nutrition-planner.service.js';

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
  request.log.error(err, 'Erro inesperado no modulo nutrition-planner');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ───────────────────────────────────────────────

export default async function nutritionPlannerRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/nutrition-planner/today ──────────────────────────
  // Retorna treino + protocolo nutricional do dia
  app.get('/api/nutrition-planner/today', { onRequest: authenticate }, async (request, reply) => {
    try {
      const result = await plannerService.getTodayPlan(request.userId);
      return reply.send({ data: result });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/nutrition-planner/generate/:workoutId ──────────
  // Gera protocolo nutricional via IA
  app.post('/api/nutrition-planner/generate/:workoutId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = workoutIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: paramsParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const protocol = await plannerService.generateProtocol(
        request.userId,
        paramsParsed.data.workoutId,
      );

      request.log.info(
        { userId: request.userId, workoutId: paramsParsed.data.workoutId },
        'Protocolo nutricional gerado via IA',
      );
      return reply.status(201).send({ data: protocol });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/nutrition-planner/accept/:protocolId ───────────
  // Marca protocolo como aceito
  app.post('/api/nutrition-planner/accept/:protocolId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = protocolIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: paramsParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const protocol = await plannerService.acceptProtocol(
        request.userId,
        paramsParsed.data.protocolId,
      );

      request.log.info(
        { userId: request.userId, protocolId: paramsParsed.data.protocolId },
        'Protocolo nutricional aceito',
      );
      return reply.send({ data: protocol });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/nutrition-planner/apply-preset/:workoutId ──────
  // Aplica preset do usuario como protocolo
  app.post('/api/nutrition-planner/apply-preset/:workoutId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = workoutIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: paramsParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const protocol = await plannerService.applyPreset(
        request.userId,
        paramsParsed.data.workoutId,
      );

      request.log.info(
        { userId: request.userId, workoutId: paramsParsed.data.workoutId },
        'Preset aplicado como protocolo',
      );
      return reply.send({ data: protocol });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── PUT /api/nutrition-planner/customize/:protocolId ──────────
  // Edita itens do protocolo
  app.put('/api/nutrition-planner/customize/:protocolId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = protocolIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: paramsParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const bodyParsed = customizeProtocolBody.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: bodyParsed.error.errors[0]?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const protocol = await plannerService.customizeProtocol(
        request.userId,
        paramsParsed.data.protocolId,
        bodyParsed.data,
      );

      request.log.info(
        { userId: request.userId, protocolId: paramsParsed.data.protocolId },
        'Protocolo nutricional customizado',
      );
      return reply.send({ data: protocol });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
