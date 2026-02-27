import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { generateStructuredJSON, CLAUDE_MODELS } from '../../lib/claude.js';
import { buildNutritionAnalysisPrompt } from './prompts/nutrition-analysis.prompt.js';

// ── Tipos internos ────────────────────────────────────────────────

interface AnalysisInsight {
  category: string;
  severity: string;
  insight: string;
  recommendation: string;
}

interface AnalysisPattern {
  pattern: string;
  frequency: string;
  recommendation: string;
}

interface AnalysisResult {
  adherenceScore: number;
  insights: AnalysisInsight[];
  patterns: AnalysisPattern[];
  summary: string;
}

interface DisciplinePattern {
  discipline: string;
  avgAdherenceScore: number;
  avgCarbsPerHour: number;
  avgSodiumPerHour: number;
  count: number;
}

// ── analyzeActivity ─────────────────────────────────────────────────
// Gera analise pos-treino via Claude Haiku, salva insights e atualiza adherenceScore

export async function analyzeActivity(userId: string, activityId: string) {
  // 1. Busca atividade com treino planejado e protocolo nutricional
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(schema.activities.id, activityId),
      eq(schema.activities.userId, userId),
    ),
    with: {
      plannedWorkout: {
        with: {
          nutritionProtocol: true,
        },
      },
    },
  });

  if (!activity) {
    throw {
      code: 'ERR_ACTIVITY_NOT_FOUND',
      message: 'Atividade nao encontrada ou nao pertence ao usuario',
      status: 404,
    };
  }

  // 2. Busca log de nutricao com itens
  const nutritionLog = await db.query.nutritionLogs.findFirst({
    where: and(
      eq(schema.nutritionLogs.activityId, activityId),
      eq(schema.nutritionLogs.userId, userId),
    ),
    with: {
      items: true,
    },
  });

  // 3. Busca perfil do atleta para peso
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  // 4. Busca historico das ultimas 20 atividades com adherence scores
  const recentLogs = await db
    .select({
      discipline: schema.activities.discipline,
      adherenceScore: schema.nutritionLogs.adherenceScore,
      carbsPerHour: schema.nutritionLogs.carbsPerHour,
    })
    .from(schema.nutritionLogs)
    .innerJoin(
      schema.activities,
      eq(schema.nutritionLogs.activityId, schema.activities.id),
    )
    .where(
      and(
        eq(schema.nutritionLogs.userId, userId),
        sql`${schema.nutritionLogs.adherenceScore} IS NOT NULL`,
      ),
    )
    .orderBy(desc(schema.activities.startedAt))
    .limit(20);

  const historicalPatterns = recentLogs.map((log) => ({
    discipline: log.discipline,
    adherenceScore: Number(log.adherenceScore ?? 0),
    carbsPerHour: Number(log.carbsPerHour ?? 0),
  }));

  // Monta dados do protocolo prescrito
  const protocol = activity.plannedWorkout?.nutritionProtocol ?? null;
  const prescribed = protocol
    ? {
        items: protocol.items,
        totalCarbsG: Number(protocol.totalCarbsG ?? 0),
        totalSodiumMg: Number(protocol.totalSodiumMg ?? 0),
        totalCaffeineMg: Number(protocol.totalCaffeineMg ?? 0),
        totalKcal: Number(protocol.totalKcal ?? 0),
      }
    : null;

  // Monta dados do consumo real
  const actual = nutritionLog
    ? {
        items: nutritionLog.items,
        totalCarbsG: Number(nutritionLog.totalCarbsG ?? 0),
        totalSodiumMg: Number(nutritionLog.totalSodiumMg ?? 0),
        totalCaffeineMg: Number(nutritionLog.totalCaffeineMg ?? 0),
        totalKcal: Number(nutritionLog.totalKcal ?? 0),
      }
    : null;

  // Calcula metricas por hora
  const durationHours = (activity.durationSec ?? 0) / 3600;
  const carbsPerHour =
    actual && durationHours > 0
      ? Number((actual.totalCarbsG / durationHours).toFixed(1))
      : 0;
  const sodiumPerHour =
    actual && durationHours > 0
      ? Number((actual.totalSodiumMg / durationHours).toFixed(1))
      : 0;

  // 5. Monta prompt e chama Claude Haiku
  const { system, prompt } = buildNutritionAnalysisPrompt({
    workout: {
      discipline: activity.discipline,
      title: activity.title,
      durationMin: activity.durationSec ? Math.round(activity.durationSec / 60) : null,
      intensityZone: activity.plannedWorkout?.intensityZone ?? null,
    },
    prescribed,
    actual,
    metrics: { carbsPerHour, sodiumPerHour },
    athleteWeight: profile?.weightKg ?? null,
    historicalPatterns,
  });

  const result = await generateStructuredJSON<AnalysisResult>({
    model: CLAUDE_MODELS.HAIKU,
    system,
    prompt,
    maxTokens: 2000,
  });

  // 6. Remove insights anteriores desta atividade (categoria nutrition)
  await db
    .delete(schema.aiInsights)
    .where(
      and(
        eq(schema.aiInsights.activityId, activityId),
        eq(schema.aiInsights.category, 'nutrition'),
      ),
    );

  // Salva cada insight na tabela ai_insights
  for (const insight of result.insights) {
    await db.insert(schema.aiInsights).values({
      activityId,
      category: 'nutrition',
      insight: insight.insight,
      recommendation: insight.recommendation,
      score: (result.adherenceScore / 100).toFixed(2),
      alertLevel: insight.severity,
    });
  }

  // 7. Atualiza adherenceScore no nutrition_logs
  if (nutritionLog) {
    await db
      .update(schema.nutritionLogs)
      .set({
        adherenceScore: result.adherenceScore.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(schema.nutritionLogs.id, nutritionLog.id));
  }

  // 8. Retorna a analise completa
  return {
    activityId,
    adherenceScore: result.adherenceScore,
    insights: result.insights,
    patterns: result.patterns,
    summary: result.summary,
  };
}

// ── getAnalysis ───────────────────────────────────────────────────────
// Retorna analise existente de uma atividade a partir da tabela ai_insights

export async function getAnalysis(userId: string, activityId: string) {
  // Valida que a atividade pertence ao usuario
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(schema.activities.id, activityId),
      eq(schema.activities.userId, userId),
    ),
  });

  if (!activity) {
    throw {
      code: 'ERR_ACTIVITY_NOT_FOUND',
      message: 'Atividade nao encontrada ou nao pertence ao usuario',
      status: 404,
    };
  }

  // Busca insights salvos
  const insights = await db
    .select()
    .from(schema.aiInsights)
    .where(
      and(
        eq(schema.aiInsights.activityId, activityId),
        eq(schema.aiInsights.category, 'nutrition'),
      ),
    )
    .orderBy(schema.aiInsights.createdAt);

  if (insights.length === 0) {
    return null;
  }

  // Busca adherenceScore do nutrition_log
  const nutritionLog = await db.query.nutritionLogs.findFirst({
    where: and(
      eq(schema.nutritionLogs.activityId, activityId),
      eq(schema.nutritionLogs.userId, userId),
    ),
  });

  return {
    activityId,
    adherenceScore: nutritionLog ? Number(nutritionLog.adherenceScore ?? 0) : null,
    insights: insights.map((i) => ({
      id: i.id,
      insight: i.insight,
      recommendation: i.recommendation,
      alertLevel: i.alertLevel,
      score: i.score ? Number(i.score) : null,
      createdAt: i.createdAt,
    })),
  };
}

// ── getPatterns ───────────────────────────────────────────────────────
// Agrega padroes nutricionais por disciplina nos ultimos N dias

export async function getPatterns(userId: string, days: number) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  // Query nutrition_logs com activities dos ultimos N dias
  const rows = await db
    .select({
      discipline: schema.activities.discipline,
      adherenceScore: schema.nutritionLogs.adherenceScore,
      carbsPerHour: schema.nutritionLogs.carbsPerHour,
      sodiumPerHour: schema.nutritionLogs.sodiumPerHour,
    })
    .from(schema.nutritionLogs)
    .innerJoin(
      schema.activities,
      eq(schema.nutritionLogs.activityId, schema.activities.id),
    )
    .where(
      and(
        eq(schema.nutritionLogs.userId, userId),
        gte(schema.activities.startedAt, sinceDate),
      ),
    )
    .orderBy(desc(schema.activities.startedAt));

  // Agrupa por disciplina
  const grouped = new Map<string, { adherenceScores: number[]; carbsPerHour: number[]; sodiumPerHour: number[] }>();

  for (const row of rows) {
    const discipline = row.discipline;
    if (!grouped.has(discipline)) {
      grouped.set(discipline, { adherenceScores: [], carbsPerHour: [], sodiumPerHour: [] });
    }
    const group = grouped.get(discipline)!;

    if (row.adherenceScore !== null) {
      group.adherenceScores.push(Number(row.adherenceScore));
    }
    if (row.carbsPerHour !== null) {
      group.carbsPerHour.push(Number(row.carbsPerHour));
    }
    if (row.sodiumPerHour !== null) {
      group.sodiumPerHour.push(Number(row.sodiumPerHour));
    }
  }

  // Calcula medias por disciplina
  const patterns: DisciplinePattern[] = [];

  for (const [discipline, group] of grouped) {
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    patterns.push({
      discipline,
      avgAdherenceScore: Number(avg(group.adherenceScores).toFixed(1)),
      avgCarbsPerHour: Number(avg(group.carbsPerHour).toFixed(1)),
      avgSodiumPerHour: Number(avg(group.sodiumPerHour).toFixed(1)),
      count: group.adherenceScores.length || group.carbsPerHour.length,
    });
  }

  return {
    days,
    totalActivities: rows.length,
    patterns,
  };
}
