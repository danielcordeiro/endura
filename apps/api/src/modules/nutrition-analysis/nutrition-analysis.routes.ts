import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { activityIdParams, patternsQuery } from './nutrition-analysis.schemas.js';
import * as analysisService from './nutrition-analysis.service.js';

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
  request.log.error(err, 'Erro inesperado no modulo nutrition-analysis');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ───────────────────────────────────────────────

export default async function nutritionAnalysisRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/nutrition-analysis/:activityId ──────────────────
  // Gera analise pos-treino via IA
  app.post('/api/nutrition-analysis/:activityId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = activityIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: paramsParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const analysis = await analysisService.analyzeActivity(
        request.userId,
        paramsParsed.data.activityId,
      );

      request.log.info(
        { userId: request.userId, activityId: paramsParsed.data.activityId },
        'Analise nutricional pos-treino gerada via IA',
      );
      return reply.status(201).send({ data: analysis });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/nutrition-analysis/patterns ──────────────────────
  // Retorna padroes nutricionais agregados
  // NOTA: esta rota deve vir ANTES da rota com :activityId para evitar conflito
  app.get('/api/nutrition-analysis/patterns', { onRequest: authenticate }, async (request, reply) => {
    try {
      const queryParsed = patternsQuery.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: queryParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const patterns = await analysisService.getPatterns(
        request.userId,
        queryParsed.data.days,
      );

      return reply.send({ data: patterns });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/nutrition-analysis/:activityId ───────────────────
  // Retorna analise existente de uma atividade
  app.get('/api/nutrition-analysis/:activityId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = activityIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: paramsParsed.error.errors[0]?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const analysis = await analysisService.getAnalysis(
        request.userId,
        paramsParsed.data.activityId,
      );

      if (!analysis) {
        return reply.status(404).send({
          code: 'ERR_ANALYSIS_NOT_FOUND',
          message: 'Analise nutricional nao encontrada para esta atividade. Use POST para gerar.',
          status: 404,
        });
      }

      return reply.send({ data: analysis });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
