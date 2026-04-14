import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import * as performanceService from './performance.service.js';

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
  request.log.error(err, 'Erro inesperado no modulo performance');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ───────────────────────────────────────────────

export default async function performanceRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/performance/dashboard ─────────────────────────────
  // Retorna todos os dados de performance: PMC, readiness, race prediction
  app.get('/api/performance/dashboard', { onRequest: authenticate }, async (request, reply) => {
    try {
      const data = await performanceService.getPerformanceDashboard(request.userId);
      return reply.send({ data });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/performance/pmc ───────────────────────────────────
  // Retorna dados PMC (CTL/ATL/TSB) para o periodo solicitado
  app.get<{ Querystring: { days?: string } }>(
    '/api/performance/pmc',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const days = Math.min(365, Math.max(7, Number(request.query.days ?? 90)));
        const pmc = await performanceService.calculatePMC(request.userId, days);
        return reply.send({ data: pmc });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── GET /api/performance/readiness ─────────────────────────────
  // Retorna avaliacao de prontidao e recomendacao do mentor AI
  app.get('/api/performance/readiness', { onRequest: authenticate }, async (request, reply) => {
    try {
      const pmc = await performanceService.calculatePMC(request.userId, 90);
      const readiness = await performanceService.assessReadiness(request.userId, pmc);
      return reply.send({ data: readiness });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/performance/readiness ────────────────────────────
  // Recalcula readiness com input subjetivo do atleta
  app.post<{ Body: { feeling: number; muscleSoreness: number; injuryNote?: string | null } }>(
    '/api/performance/readiness',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const { feeling, muscleSoreness, injuryNote } = request.body;
        if (!feeling || feeling < 1 || feeling > 5 || !muscleSoreness || muscleSoreness < 1 || muscleSoreness > 5) {
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: 'feeling e muscleSoreness devem ser de 1 a 5',
            status: 400,
          });
        }
        const pmc = await performanceService.calculatePMC(request.userId, 90);
        const readiness = await performanceService.assessReadiness(request.userId, pmc, {
          feeling,
          muscleSoreness,
          injuryNote: injuryNote ?? null,
        });
        return reply.send({ data: readiness });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── GET /api/performance/race-prediction ───────────────────────
  // Retorna previsao de tempo para IM 70.3
  app.get('/api/performance/race-prediction', { onRequest: authenticate }, async (request, reply) => {
    try {
      const pmc = await performanceService.calculatePMC(request.userId, 90);
      const prediction = await performanceService.predictRaceTime(request.userId, pmc);
      if (!prediction) {
        return reply.status(404).send({
          code: 'ERR_NO_DATA',
          message: 'Dados insuficientes para previsao. Complete seu perfil e sincronize atividades.',
          status: 404,
        });
      }
      return reply.send({ data: prediction });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/performance/target-race ───────────────────────────
  // Retorna informacoes da prova alvo
  app.get('/api/performance/target-race', { onRequest: authenticate }, async (request, reply) => {
    try {
      const pmc = await performanceService.calculatePMC(request.userId, 90);
      const targetRace = await performanceService.getTargetRace(request.userId, pmc);
      return reply.send({ data: targetRace });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
