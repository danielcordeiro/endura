import Fastify from 'fastify';
import cors from '@fastify/cors';
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
import { startStravaSyncJob } from './jobs/strava-sync.job.js';
import { startTokenRefreshJob } from './jobs/token-refresh.job.js';
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

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
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

// ── Jobs (cron) ──────────────────────────────────────────────────
startStravaSyncJob();
startTokenRefreshJob();

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
