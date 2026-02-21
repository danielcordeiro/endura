import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { activityListQuery, activityParams } from './activity.schemas.js';
import * as activityService from './activity.service.js';

// ── Tratamento de erros padronizado ──────────────────────────────

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

async function handleError(
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
  request.log.error(err, 'Erro inesperado no modulo activity');
  reply.status(500).send({
    code: 'ERR_INTERNAL',
    message: 'Erro interno do servidor',
    status: 500,
  });
}

// ── Plugin de rotas ──────────────────────────────────────────────

export default async function activityRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/activities ─────────────────────────────────────
  app.get(
    '/api/activities',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const parsed = activityListQuery.safeParse(request.query);
        if (!parsed.success) {
          const firstError = parsed.error.errors[0];
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: firstError?.message ?? 'Parametros de consulta invalidos',
            status: 400,
          });
        }

        const result = await activityService.listActivities(
          request.userId,
          parsed.data,
        );

        return reply.send({
          data: result.items,
          meta: result.meta,
        });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── GET /api/activities/:id ─────────────────────────────────
  app.get(
    '/api/activities/:id',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const parsed = activityParams.safeParse(request.params);
        if (!parsed.success) {
          const firstError = parsed.error.errors[0];
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: firstError?.message ?? 'Parametro de ID invalido',
            status: 400,
          });
        }

        const activity = await activityService.getActivity(
          request.userId,
          parsed.data.id,
        );

        return reply.send({ data: activity });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );
}
