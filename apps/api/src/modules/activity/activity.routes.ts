import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import { activityListQuery, activityParams, setActivityBikeBody } from './activity.schemas.js';
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

// ── Helpers ─────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

function formatDistance(meters: string | null): string | undefined {
  if (!meters) return undefined;
  const km = Number(meters) / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Number(meters).toFixed(0)} m`;
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

        const data = result.items.map((item) => ({
          id: item.id,
          title: item.title ?? 'Atividade',
          discipline: item.discipline,
          date: item.startedAt.toISOString(),
          duration: formatDuration(item.durationSec),
          distance: formatDistance(item.distanceM),
          hasNutrition: false,
        }));

        return reply.send({
          data,
          meta: {
            ...result.meta,
            hasMore: result.meta.page < result.meta.totalPages,
          },
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

        const raw = await activityService.getActivity(
          request.userId,
          parsed.data.id,
        );

        // Transforma nutrition log + items para o formato esperado pelo frontend
        const nutrition = (raw.nutritionLog?.items ?? []).map((item) => ({
          id: item.id,
          phase: item.phase,
          product: item.productName,
          quantity: item.quantity ?? '',
          carbsG: Number(item.carbsG ?? 0),
          sodiumMg: Number(item.sodiumMg ?? 0),
          caffeineMg: Number(item.caffeineMg ?? 0),
          kcal: Number(item.kcal ?? 0),
          minuteOffset: item.minuteOffset ?? 0,
        }));

        const totals = nutrition.reduce(
          (acc, n) => {
            // carbsG/sodiumMg/caffeineMg/kcal sao valores POR UNIDADE; quantity multiplica.
            const qty = Number(n.quantity) || 1;
            return {
              carbsG: acc.carbsG + n.carbsG * qty,
              sodiumMg: acc.sodiumMg + n.sodiumMg * qty,
              caffeineMg: acc.caffeineMg + n.caffeineMg * qty,
              kcal: acc.kcal + n.kcal * qty,
            };
          },
          { carbsG: 0, sodiumMg: 0, caffeineMg: 0, kcal: 0 },
        );

        return reply.send({
          data: {
            id: raw.id,
            title: raw.title ?? 'Atividade',
            discipline: raw.discipline,
            date: raw.startedAt.toISOString(),
            duration: formatDuration(raw.durationSec),
            distance: formatDistance(raw.distanceM),
            avgHeartRate: raw.avgHr ?? undefined,
            maxHeartRate: raw.maxHr ?? undefined,
            avgPowerW: raw.avgPowerW ?? undefined,
            elevationM: raw.elevationM != null ? Number(raw.elevationM) : undefined,
            calories: raw.calories ?? undefined,
            tss: raw.tss != null ? Number(raw.tss) : undefined,
            hasStreams: raw.hasStreams,
            analysis: raw.analysis ?? undefined,
            bikeId: raw.bikeId ?? null,
            nutrition,
            totals,
          },
        });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── GET /api/activities/:id/streams ──────────────────────────
  // Séries temporais (downsampled) pro gráfico Potência/FC/Cadência da
  // aba "Mapa & Gráfico" + marcadores de início de cada lap.
  app.get(
    '/api/activities/:id/streams',
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

        const data = await activityService.getActivityStreamsForChart(request.userId, parsed.data.id);
        return reply.send({ data });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── PUT /api/activities/:id/bike ────────────────────────────
  // Troca a bike usada na atividade → recomputa o CdA a partir das streams
  // salvas (sem chamar o Strava). Retorna a análise recalculada.
  app.put<{ Params: { id: string } }>(
    '/api/activities/:id/bike',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const parsedParams = activityParams.safeParse(request.params);
        if (!parsedParams.success) {
          return reply.status(400).send({ code: 'ERR_VALIDATION', message: 'Parametro de ID invalido', status: 400 });
        }
        const parsedBody = setActivityBikeBody.safeParse(request.body);
        if (!parsedBody.success) {
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: parsedBody.error.errors[0]?.message ?? 'Dados invalidos',
            status: 400,
          });
        }
        const result = await activityService.setActivityBike(
          request.userId,
          parsedParams.data.id,
          parsedBody.data.bikeId,
        );
        return reply.send({ data: result });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── DELETE /api/activities/:id ──────────────────────────────
  app.delete(
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

        await activityService.deleteActivity(request.userId, parsed.data.id);

        request.log.info(
          { userId: request.userId, activityId: parsed.data.id },
          'Atividade removida',
        );
        return reply.send({ data: { message: 'Atividade removida' } });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );
}
