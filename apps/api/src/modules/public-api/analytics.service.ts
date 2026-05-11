import { sql } from 'drizzle-orm';
import { db } from '../../lib/db.js';

// ── Analytics agregados pra agente coach ───────────────────────────
// Tudo SQL puro pra agregacao eficiente — Drizzle relations seriam N+1.

export interface WeeklyBucket {
  weekStart: string; // YYYY-MM-DD (segunda-feira ISO)
  discipline: string;
  activities: number;
  durationSec: number;
  distanceM: number;
  tss: number;
}

export async function getWeeklyAnalytics(userId: string, weeks: number): Promise<WeeklyBucket[]> {
  const safeWeeks = Math.max(1, Math.min(52, weeks));
  const result = await db.execute(sql`
    SELECT
      DATE_TRUNC('week', a.started_at)::date AS week_start,
      a.discipline,
      COUNT(*)::int AS activities,
      COALESCE(SUM(a.duration_sec), 0)::int AS duration_sec,
      COALESCE(SUM(a.distance_m), 0)::numeric AS distance_m,
      COALESCE(SUM(pw.tss_estimate), 0)::numeric AS tss
    FROM activities a
    LEFT JOIN planned_workouts pw ON pw.id = a.planned_workout_id
    WHERE a.user_id = ${userId}
      AND a.started_at >= NOW() - (${safeWeeks} || ' weeks')::interval
    GROUP BY week_start, a.discipline
    ORDER BY week_start DESC, a.discipline ASC
  `);

  return (result as unknown as Array<Record<string, unknown>>).map((r) => ({
    weekStart: String(r.week_start),
    discipline: String(r.discipline),
    activities: Number(r.activities ?? 0),
    durationSec: Number(r.duration_sec ?? 0),
    distanceM: Number(r.distance_m ?? 0),
    tss: Number(r.tss ?? 0),
  }));
}

export interface NutritionSummaryRow {
  discipline: string;
  activitiesWithLog: number;
  avgCarbsPerHour: number;
  avgSodiumPerHour: number;
  avgAdherenceScore: number;
}

export async function getNutritionSummary(userId: string, days: number): Promise<NutritionSummaryRow[]> {
  const safeDays = Math.max(7, Math.min(365, days));
  const result = await db.execute(sql`
    SELECT
      a.discipline,
      COUNT(DISTINCT a.id)::int AS activities_with_log,
      AVG(NULLIF(nl.carbs_per_hour, 0))::numeric AS avg_carbs_per_hour,
      AVG(NULLIF(nl.sodium_per_hour, 0))::numeric AS avg_sodium_per_hour,
      AVG(NULLIF(nl.adherence_score, 0))::numeric AS avg_adherence_score
    FROM nutrition_logs nl
    INNER JOIN activities a ON a.id = nl.activity_id
    WHERE nl.user_id = ${userId}
      AND a.started_at >= NOW() - (${safeDays} || ' days')::interval
    GROUP BY a.discipline
    ORDER BY a.discipline ASC
  `);

  return (result as unknown as Array<Record<string, unknown>>).map((r) => ({
    discipline: String(r.discipline),
    activitiesWithLog: Number(r.activities_with_log ?? 0),
    avgCarbsPerHour: Number(r.avg_carbs_per_hour ?? 0),
    avgSodiumPerHour: Number(r.avg_sodium_per_hour ?? 0),
    avgAdherenceScore: Number(r.avg_adherence_score ?? 0),
  }));
}
