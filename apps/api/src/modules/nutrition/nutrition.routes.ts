import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import {
  activityIdParams,
  itemIdParams,
  presetIdParams,
  createItemBody,
  updateItemBody,
  createPresetBody,
  catalogSearchQuery,
} from './nutrition.schemas.js';
import * as nutritionService from './nutrition.service.js';

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
  request.log.error(err, 'Erro inesperado no modulo nutrition');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

// ── Plugin de rotas ───────────────────────────────────────────────

export default async function nutritionRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/nutrition/log/:activityId ──────────────────────────
  // Retorna o log de nutricao com itens para a atividade
  app.get('/api/nutrition/log/:activityId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = activityIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const log = await nutritionService.getNutritionLog(request.userId, paramsParsed.data.activityId);
      return reply.send({ data: log });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/nutrition/log/:activityId/items ──────────────────
  // Adiciona um item ao log de nutricao
  app.post('/api/nutrition/log/:activityId/items', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = activityIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const bodyParsed = createItemBody.safeParse(request.body);
      if (!bodyParsed.success) {
        const firstError = bodyParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const item = await nutritionService.addItem(
        request.userId,
        paramsParsed.data.activityId,
        bodyParsed.data,
      );

      request.log.info(
        { userId: request.userId, activityId: paramsParsed.data.activityId },
        'Item de nutricao adicionado',
      );
      return reply.status(201).send({ data: item });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── PUT /api/nutrition/log/:activityId/items/:itemId ───────────
  // Atualiza um item do log de nutricao
  app.put('/api/nutrition/log/:activityId/items/:itemId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = itemIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const bodyParsed = updateItemBody.safeParse(request.body);
      if (!bodyParsed.success) {
        const firstError = bodyParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const item = await nutritionService.updateItem(
        request.userId,
        paramsParsed.data.activityId,
        paramsParsed.data.itemId,
        bodyParsed.data,
      );

      request.log.info(
        { userId: request.userId, itemId: paramsParsed.data.itemId },
        'Item de nutricao atualizado',
      );
      return reply.send({ data: item });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── DELETE /api/nutrition/log/:activityId/items/:itemId ────────
  // Remove um item do log de nutricao
  app.delete('/api/nutrition/log/:activityId/items/:itemId', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = itemIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      await nutritionService.deleteItem(
        request.userId,
        paramsParsed.data.activityId,
        paramsParsed.data.itemId,
      );

      request.log.info(
        { userId: request.userId, itemId: paramsParsed.data.itemId },
        'Item de nutricao removido',
      );
      return reply.status(204).send();
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/nutrition/presets ──────────────────────────────────
  // Lista presets de suplementacao do usuario
  app.get('/api/nutrition/presets', { onRequest: authenticate }, async (request, reply) => {
    try {
      const presets = await nutritionService.listPresets(request.userId);
      return reply.send({ data: presets });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── POST /api/nutrition/presets ─────────────────────────────────
  // Cria um novo preset de suplementacao
  app.post('/api/nutrition/presets', { onRequest: authenticate }, async (request, reply) => {
    try {
      const bodyParsed = createPresetBody.safeParse(request.body);
      if (!bodyParsed.success) {
        const firstError = bodyParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Dados invalidos',
          status: 400,
        });
      }

      const preset = await nutritionService.createPreset(request.userId, bodyParsed.data);
      request.log.info({ userId: request.userId, presetId: preset.id }, 'Preset de suplementacao criado');
      return reply.status(201).send({ data: preset });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── DELETE /api/nutrition/presets/:id ───────────────────────────
  // Remove um preset de suplementacao
  app.delete('/api/nutrition/presets/:id', { onRequest: authenticate }, async (request, reply) => {
    try {
      const paramsParsed = presetIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        const firstError = paramsParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      await nutritionService.deletePreset(request.userId, paramsParsed.data.id);
      request.log.info({ userId: request.userId, presetId: paramsParsed.data.id }, 'Preset removido');
      return reply.status(204).send();
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/nutrition/catalog/search ──────────────────────────
  // Busca produtos no catalogo curado
  app.get('/api/nutrition/catalog/search', { onRequest: authenticate }, async (request, reply) => {
    try {
      const queryParsed = catalogSearchQuery.safeParse(request.query);
      if (!queryParsed.success) {
        const firstError = queryParsed.error.errors[0];
        return reply.status(400).send({
          code: 'ERR_VALIDATION',
          message: firstError?.message ?? 'Parametros invalidos',
          status: 400,
        });
      }

      const { q, category, limit } = queryParsed.data;
      const products = await nutritionService.searchCatalog(q, category, limit);
      return reply.send({ data: products });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });

  // ── GET /api/nutrition/shopping-list ───────────────────────────
  // Gera lista de compras da semana atual
  app.get('/api/nutrition/shopping-list', { onRequest: authenticate }, async (request, reply) => {
    try {
      const list = await nutritionService.getShoppingList(request.userId);
      return reply.send({ data: list });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
