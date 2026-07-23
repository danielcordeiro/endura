import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { createBikeBody, updateBikeBody } from './bike.schemas.js';
import * as bikeService from './bike.service.js';

interface AppError { code: string; message: string; status: number }

function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && 'code' in err && 'message' in err && 'status' in err;
}

async function handleError(err: unknown, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (isAppError(err)) {
    request.log.warn({ code: err.code }, err.message);
    reply.status(err.status).send({ code: err.code, message: err.message, status: err.status });
    return;
  }
  request.log.error(err, 'Erro inesperado no modulo bike');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

function validationError(reply: FastifyReply, message?: string) {
  return reply.status(400).send({ code: 'ERR_VALIDATION', message: message ?? 'Dados invalidos', status: 400 });
}

export default async function bikeRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/bikes ──────────────────────────────────────────
  app.get('/api/bikes', { onRequest: authenticate }, async (request, reply) => {
    try {
      const bikes = await bikeService.listBikes(request.userId);
      return reply.send({ data: bikes });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/bikes ─────────────────────────────────────────
  app.post('/api/bikes', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = createBikeBody.safeParse(request.body);
      if (!parsed.success) return validationError(reply, parsed.error.errors[0]?.message);
      const bike = await bikeService.createBike(request.userId, parsed.data);
      request.log.info({ userId: request.userId, bikeId: bike.id }, 'Bike criada');
      return reply.status(201).send({ data: bike });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── PUT /api/bikes/:id ──────────────────────────────────────
  app.put<{ Params: { id: string } }>('/api/bikes/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const parsed = updateBikeBody.safeParse(request.body);
      if (!parsed.success) return validationError(reply, parsed.error.errors[0]?.message);
      const bike = await bikeService.updateBike(request.userId, request.params.id, parsed.data);
      return reply.send({ data: bike });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/bikes/:id/default ─────────────────────────────
  app.post<{ Params: { id: string } }>('/api/bikes/:id/default', { onRequest: authenticate }, async (request, reply) => {
    try {
      const bike = await bikeService.setDefaultBike(request.userId, request.params.id);
      return reply.send({ data: bike });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── DELETE /api/bikes/:id ───────────────────────────────────
  app.delete<{ Params: { id: string } }>('/api/bikes/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const result = await bikeService.deleteBike(request.userId, request.params.id);
      return reply.send({ data: result });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
