import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Agent, setGlobalDispatcher } from 'undici';

// Aumenta connect timeout do fetch global para 30s (intervals.icu pode ser lento).
setGlobalDispatcher(new Agent({ connect: { timeout: 30_000 } }));
import authRoutes from './modules/auth/auth.routes.js';
import athleteRoutes from './modules/athlete/athlete.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import stravaRoutes from './modules/integration/strava.routes.js';
import intervalsRoutes from './modules/integration/intervals.routes.js';
import planRoutes from './modules/plan/plan.routes.js';
import nutritionRoutes from './modules/nutrition/nutrition.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import nutritionPlannerRoutes from './modules/nutrition-planner/nutrition-planner.routes.js';
import nutritionAnalysisRoutes from './modules/nutrition-analysis/nutrition-analysis.routes.js';
import raceNutritionRoutes from './modules/race-nutrition/race-nutrition.routes.js';
import performanceRoutes from './modules/performance/performance.routes.js';
import fitnessTestsRoutes from './modules/fitness-tests/fitness-tests.routes.js';
import apiKeyRoutes from './modules/api-key/api-key.routes.js';
import publicApiRoutes from './modules/public-api/public-api.routes.js';
import { startStravaSyncJob } from './jobs/strava-sync.job.js';
import { startTokenRefreshJob } from './jobs/token-refresh.job.js';
import { startWellnessSyncJob } from './jobs/wellness-sync.job.js';
import { startIntervalsActivitiesSyncJob } from './jobs/intervals-activities-sync.job.js';
import { db } from './lib/db.js';
import { sql } from 'drizzle-orm';

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
    redact: {
      paths: [
        'req.headers.authorization',
        'access_token',
        'refresh_token',
        'accessTokenEnc',
        'refreshTokenEnc',
        'code',
      ],
      censor: '[REDACTED]',
    },
  },
});

// ── CORS global ───────────────────────────────────────────────────
// origin:true reflete a origem requisitante. Seguro neste app porque a
// autenticacao e por Bearer/API Key em header, nao por cookies — entao nao
// ha exposicao a CSRF mesmo com CORS permissivo. Necessario para consumo
// externo da API publica (/api/v1/public/*) por LLMs, integracoes etc.
await app.register(cors, {
  origin: true,
  credentials: true,
});

// ── Rate-limit global (opt-in por rota) ──────────────────────────
// Rotas sensiveis adicionam `config: { rateLimit: {...} }`
await app.register(rateLimit, {
  global: false,
  max: 10,
  timeWindow: '1 minute',
});

// ── API publica: rate-limit dedicado em escopo isolado ────────────
await app.register(async (scope) => {
  await scope.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    global: true, // aplica a todas rotas do escopo
  });
  await scope.register(publicApiRoutes);
});

// ── Health check ──────────────────────────────────────────────────
app.get('/health', async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, db: 'connected', timestamp: new Date().toISOString() };
  } catch (err) {
    return { ok: false, db: 'error', error: String(err), timestamp: new Date().toISOString() };
  }
});

// ── Rotas ─────────────────────────────────────────────────────────
await app.register(authRoutes);
await app.register(athleteRoutes);
await app.register(activityRoutes);
await app.register(stravaRoutes);
await app.register(intervalsRoutes);
await app.register(planRoutes);
await app.register(nutritionRoutes);
await app.register(dashboardRoutes);
await app.register(nutritionPlannerRoutes);
await app.register(nutritionAnalysisRoutes);
await app.register(raceNutritionRoutes);
await app.register(performanceRoutes);
await app.register(fitnessTestsRoutes);
await app.register(apiKeyRoutes);

// ── Jobs (cron) ──────────────────────────────────────────────────
startStravaSyncJob();
startTokenRefreshJob();
startWellnessSyncJob();
startIntervalsActivitiesSyncJob();

// ── Start ─────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err, 'Falha ao iniciar servidor');
  process.exit(1);
}

export default app;
