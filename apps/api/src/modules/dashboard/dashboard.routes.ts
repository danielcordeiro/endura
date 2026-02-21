import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import * as dashboardService from './dashboard.service.js';

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
  request.log.error(err, 'Erro inesperado no modulo dashboard');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ───────────────────────────────────────────────

export default async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/dashboard/summary ──────────────────────────────────
  // Retorna o resumo do dashboard do usuario autenticado
  app.get('/api/dashboard/summary', { onRequest: authenticate }, async (request, reply) => {
    try {
      const summary = await dashboardService.getDashboardSummary(request.userId);
      return reply.send({ data: summary });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
