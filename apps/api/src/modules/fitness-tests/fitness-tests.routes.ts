import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../auth/auth.middleware.js';
import * as fitnessTestsService from './fitness-tests.service.js';

interface AppError {
  code: string;
  message: string;
  status: number;
}

function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && 'code' in err && 'message' in err && 'status' in err;
}

async function handleError(err: unknown, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (isAppError(err)) {
    request.log.warn({ code: err.code }, err.message);
    reply.status(err.status).send({ code: err.code, message: err.message, status: err.status });
    return;
  }
  request.log.error(err, 'Erro inesperado no modulo fitness-tests');
  reply.status(500).send({ code: 'ERR_INTERNAL', message: 'Erro interno do servidor', status: 500 });
}

interface CreateTestBody {
  testType: 'swim_t30' | 'bike_ftp20' | 'run_cooper12';
  testDate: string;
  distanceM?: number | null;
  durationSec?: number | null;
  avgPowerW?: number | null;
  avgHr?: number | null;
  notes?: string | null;
}

export default async function fitnessTestsRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/fitness-tests ────────────────────────────────────
  app.post<{ Body: CreateTestBody }>(
    '/api/fitness-tests',
    { onRequest: authenticate },
    async (request, reply) => {
      try {
        const body = request.body as CreateTestBody;
        const validTypes = ['swim_t30', 'bike_ftp20', 'run_cooper12'];
        if (!validTypes.includes(body.testType)) {
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: 'testType invalido. Use: swim_t30, bike_ftp20, run_cooper12',
            status: 400,
          });
        }
        if (!body.testDate?.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return reply.status(400).send({
            code: 'ERR_VALIDATION',
            message: 'testDate invalido. Use formato YYYY-MM-DD',
            status: 400,
          });
        }

        const test = await fitnessTestsService.createTest(request.userId, body);
        request.log.info({ userId: request.userId, testType: body.testType }, 'Teste de fitness registrado');
        return reply.status(201).send({ data: test });
      } catch (err) {
        await handleError(err, request, reply);
      }
    },
  );

  // ── GET /api/fitness-tests ─────────────────────────────────────
  app.get('/api/fitness-tests', { onRequest: authenticate }, async (request, reply) => {
    try {
      const data = await fitnessTestsService.getLatestTests(request.userId);
      return reply.send({ data });
    } catch (err) {
      await handleError(err, request, reply);
    }
  });
}
