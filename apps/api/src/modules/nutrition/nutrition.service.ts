import { eq, and, gte, lte, or, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import type { CreateItemBody, UpdateItemBody, CreatePresetBody } from './nutrition.schemas.js';

// ── Tipos internos ────────────────────────────────────────────────

interface ShoppingListItem {
  productName: string;
  brand: string | null;
  totalQuantity: number;
  unit: string | null;
  occurrences: number;
}

interface NutritionProtocolItem {
  productName?: string;
  brand?: string;
  quantity?: number;
  unit?: string;
}

// ── getNutritionLog ───────────────────────────────────────────────
// Retorna o log de nutricao com itens para uma atividade

export async function getNutritionLog(userId: string, activityId: string) {
  const log = await db.query.nutritionLogs.findFirst({
    where: and(
      eq(schema.nutritionLogs.activityId, activityId),
      eq(schema.nutritionLogs.userId, userId),
    ),
    with: {
      items: true,
    },
  });

  // Se nao existe log, retorna null (sem erro)
  return log ?? null;
}

// ── addItem ───────────────────────────────────────────────────────
// Adiciona um item ao log de nutricao (cria o log se nao existir)

export async function addItem(userId: string, activityId: string, data: CreateItemBody) {
  // Verifica se a atividade pertence ao usuario
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

  // Busca ou cria o log de nutricao
  let log = await db.query.nutritionLogs.findFirst({
    where: and(
      eq(schema.nutritionLogs.activityId, activityId),
      eq(schema.nutritionLogs.userId, userId),
    ),
  });

  if (!log) {
    const [created] = await db
      .insert(schema.nutritionLogs)
      .values({
        activityId,
        userId,
        totalCarbsG: '0',
        totalSodiumMg: '0',
        totalCaffeineMg: '0',
        totalKcal: 0,
      })
      .returning();

    log = created!;
  }

  // Insere o item
  const [item] = await db
    .insert(schema.nutritionItems)
    .values({
      logId: log.id,
      phase: data.phase,
      minuteOffset: data.minuteOffset ?? null,
      productName: data.productName,
      brand: data.brand ?? null,
      quantity: data.quantity?.toString() ?? null,
      unit: data.unit ?? null,
      carbsG: data.carbsG?.toString() ?? null,
      sodiumMg: data.sodiumMg?.toString() ?? null,
      caffeineMg: data.caffeineMg?.toString() ?? null,
      kcal: data.kcal ?? null,
      source: data.source ?? 'manual',
    })
    .returning();

  // Recalcula totais
  await recalculateTotals(log.id);

  return item!;
}

// ── updateItem ────────────────────────────────────────────────────
// Atualiza um item do log de nutricao

export async function updateItem(
  userId: string,
  activityId: string,
  itemId: string,
  data: UpdateItemBody,
) {
  // Busca o log para validar propriedade
  const log = await db.query.nutritionLogs.findFirst({
    where: and(
      eq(schema.nutritionLogs.activityId, activityId),
      eq(schema.nutritionLogs.userId, userId),
    ),
  });

  if (!log) {
    throw {
      code: 'ERR_NUTRITION_LOG_NOT_FOUND',
      message: 'Log de nutricao nao encontrado para esta atividade',
      status: 404,
    };
  }

  // Verifica se o item pertence a este log
  const existing = await db.query.nutritionItems.findFirst({
    where: and(
      eq(schema.nutritionItems.id, itemId),
      eq(schema.nutritionItems.logId, log.id),
    ),
  });

  if (!existing) {
    throw {
      code: 'ERR_NUTRITION_ITEM_NOT_FOUND',
      message: 'Item de nutricao nao encontrado',
      status: 404,
    };
  }

  // Monta objeto de atualizacao
  const updateData: Record<string, unknown> = {};

  if (data.phase !== undefined) updateData.phase = data.phase;
  if (data.minuteOffset !== undefined) updateData.minuteOffset = data.minuteOffset;
  if (data.productName !== undefined) updateData.productName = data.productName;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.quantity !== undefined) updateData.quantity = data.quantity?.toString() ?? null;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.carbsG !== undefined) updateData.carbsG = data.carbsG?.toString() ?? null;
  if (data.sodiumMg !== undefined) updateData.sodiumMg = data.sodiumMg?.toString() ?? null;
  if (data.caffeineMg !== undefined) updateData.caffeineMg = data.caffeineMg?.toString() ?? null;
  if (data.kcal !== undefined) updateData.kcal = data.kcal;
  if (data.source !== undefined) updateData.source = data.source;

  const [updated] = await db
    .update(schema.nutritionItems)
    .set(updateData)
    .where(eq(schema.nutritionItems.id, itemId))
    .returning();

  // Recalcula totais
  await recalculateTotals(log.id);

  return updated!;
}

// ── deleteItem ────────────────────────────────────────────────────
// Remove um item do log de nutricao

export async function deleteItem(userId: string, activityId: string, itemId: string) {
  // Busca o log para validar propriedade
  const log = await db.query.nutritionLogs.findFirst({
    where: and(
      eq(schema.nutritionLogs.activityId, activityId),
      eq(schema.nutritionLogs.userId, userId),
    ),
  });

  if (!log) {
    throw {
      code: 'ERR_NUTRITION_LOG_NOT_FOUND',
      message: 'Log de nutricao nao encontrado para esta atividade',
      status: 404,
    };
  }

  // Verifica se o item pertence a este log
  const existing = await db.query.nutritionItems.findFirst({
    where: and(
      eq(schema.nutritionItems.id, itemId),
      eq(schema.nutritionItems.logId, log.id),
    ),
  });

  if (!existing) {
    throw {
      code: 'ERR_NUTRITION_ITEM_NOT_FOUND',
      message: 'Item de nutricao nao encontrado',
      status: 404,
    };
  }

  // Remove o item
  await db
    .delete(schema.nutritionItems)
    .where(eq(schema.nutritionItems.id, itemId));

  // Verifica se ainda restam itens no log
  const remainingItems = await db.query.nutritionItems.findFirst({
    where: eq(schema.nutritionItems.logId, log.id),
  });

  if (!remainingItems) {
    // Remove o log se nao restam itens
    await db
      .delete(schema.nutritionLogs)
      .where(eq(schema.nutritionLogs.id, log.id));
  } else {
    // Recalcula totais
    await recalculateTotals(log.id);
  }
}

// ── recalculateTotals ─────────────────────────────────────────────
// Soma os valores nutricionais de todos os itens e atualiza o log

export async function recalculateTotals(logId: string) {
  const items = await db
    .select()
    .from(schema.nutritionItems)
    .where(eq(schema.nutritionItems.logId, logId));

  // Drizzle retorna strings para campos numeric; converte para Number
  let totalCarbsG = 0;
  let totalSodiumMg = 0;
  let totalCaffeineMg = 0;
  let totalKcal = 0;

  for (const item of items) {
    totalCarbsG += Number(item.carbsG ?? 0);
    totalSodiumMg += Number(item.sodiumMg ?? 0);
    totalCaffeineMg += Number(item.caffeineMg ?? 0);
    totalKcal += Number(item.kcal ?? 0);
  }

  await db
    .update(schema.nutritionLogs)
    .set({
      totalCarbsG: totalCarbsG.toFixed(2),
      totalSodiumMg: totalSodiumMg.toFixed(2),
      totalCaffeineMg: totalCaffeineMg.toFixed(2),
      totalKcal: Math.round(totalKcal),
      updatedAt: new Date(),
    })
    .where(eq(schema.nutritionLogs.id, logId));
}

// ── listPresets ───────────────────────────────────────────────────
// Lista todos os presets de suplementacao do usuario

export async function listPresets(userId: string) {
  const presets = await db.query.supplementPresets.findMany({
    where: eq(schema.supplementPresets.userId, userId),
  });

  return presets;
}

// ── createPreset ──────────────────────────────────────────────────
// Cria um novo preset de suplementacao

export async function createPreset(userId: string, data: CreatePresetBody) {
  const [preset] = await db
    .insert(schema.supplementPresets)
    .values({
      userId,
      name: data.name,
      items: data.items,
    })
    .returning();

  return preset!;
}

// ── deletePreset ──────────────────────────────────────────────────
// Remove um preset de suplementacao

export async function deletePreset(userId: string, presetId: string) {
  const existing = await db.query.supplementPresets.findFirst({
    where: and(
      eq(schema.supplementPresets.id, presetId),
      eq(schema.supplementPresets.userId, userId),
    ),
  });

  if (!existing) {
    throw {
      code: 'ERR_PRESET_NOT_FOUND',
      message: 'Preset de suplementacao nao encontrado',
      status: 404,
    };
  }

  await db
    .delete(schema.supplementPresets)
    .where(eq(schema.supplementPresets.id, presetId));
}

// ── getShoppingList ───────────────────────────────────────────────
// Gera lista de compras agregada com base nos protocolos da semana

export async function getShoppingList(userId: string) {
  // Calcula inicio e fim da semana atual (segunda a domingo)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartStr = weekStart.toISOString().split('T')[0]!;
  const weekEndStr = weekEnd.toISOString().split('T')[0]!;

  // Busca treinos planejados da semana com seus protocolos de nutricao
  const workouts = await db.query.plannedWorkouts.findMany({
    where: and(
      eq(schema.plannedWorkouts.userId, userId),
      gte(schema.plannedWorkouts.scheduledDate, weekStartStr),
      lte(schema.plannedWorkouts.scheduledDate, weekEndStr),
    ),
    with: {
      nutritionProtocol: true,
    },
  });

  // Agrega itens por nome do produto
  const aggregated = new Map<string, ShoppingListItem>();

  for (const workout of workouts) {
    if (!workout.nutritionProtocol) continue;

    const protocolItems = workout.nutritionProtocol.items;
    if (!Array.isArray(protocolItems)) continue;

    for (const rawItem of protocolItems) {
      const item = rawItem as NutritionProtocolItem;
      const name = item.productName;
      if (!name) continue;

      const key = name.toLowerCase();
      const existing = aggregated.get(key);

      if (existing) {
        existing.totalQuantity += Number(item.quantity ?? 1);
        existing.occurrences += 1;
      } else {
        aggregated.set(key, {
          productName: name,
          brand: item.brand ?? null,
          totalQuantity: Number(item.quantity ?? 1),
          unit: item.unit ?? null,
          occurrences: 1,
        });
      }
    }
  }

  return Array.from(aggregated.values());
}

// ── searchCatalog ────────────────────────────────────────────────
// Busca produtos no catalogo curado por nome ou marca

export async function searchCatalog(query: string, category?: string, limit = 10) {
  const searchTerm = `%${query}%`;

  const conditions = [
    eq(schema.productCatalog.active, true),
    or(
      ilike(schema.productCatalog.name, searchTerm),
      ilike(schema.productCatalog.brand, searchTerm),
    ),
  ];

  if (category) {
    conditions.push(eq(schema.productCatalog.category, category));
  }

  const results = await db
    .select()
    .from(schema.productCatalog)
    .where(and(...conditions))
    .orderBy(schema.productCatalog.brand, schema.productCatalog.name)
    .limit(Math.min(limit, 20));

  return results;
}

// ── followProtocol ────────────────────────────────────────────────
// Copia itens do protocolo prescrito para o log da atividade (1 tap)
export async function followProtocol(userId: string, activityId: string, protocolId: string) {
  // Verify activity belongs to user
  const activity = await db.query.activities.findFirst({
    where: and(eq(schema.activities.id, activityId), eq(schema.activities.userId, userId)),
  });
  if (!activity) throw { code: 'ERR_ACTIVITY_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 };

  // Get protocol
  const protocol = await db.query.nutritionProtocols.findFirst({
    where: eq(schema.nutritionProtocols.id, protocolId),
  });
  if (!protocol) throw { code: 'ERR_PROTOCOL_NOT_FOUND', message: 'Protocolo nao encontrado', status: 404 };

  // Delete existing log if any
  const existingLog = await db.query.nutritionLogs.findFirst({
    where: and(eq(schema.nutritionLogs.activityId, activityId), eq(schema.nutritionLogs.userId, userId)),
  });
  if (existingLog) {
    await db.delete(schema.nutritionItems).where(eq(schema.nutritionItems.logId, existingLog.id));
    await db.delete(schema.nutritionLogs).where(eq(schema.nutritionLogs.id, existingLog.id));
  }

  // Calculate metrics
  const durationHours = (activity.durationSec ?? 0) / 3600;
  const protocolItems = protocol.items as Array<{phase:string;minuteOffset?:number;productName:string;brand?:string;quantity?:number;unit?:string;carbsG?:number;sodiumMg?:number;caffeineMg?:number;kcal?:number}>;

  let totalCarbsG = 0, totalSodiumMg = 0, totalCaffeineMg = 0, totalKcal = 0;
  for (const item of protocolItems) {
    totalCarbsG += Number(item.carbsG ?? 0);
    totalSodiumMg += Number(item.sodiumMg ?? 0);
    totalCaffeineMg += Number(item.caffeineMg ?? 0);
    totalKcal += Number(item.kcal ?? 0);
  }

  const carbsPerHour = durationHours > 0 ? totalCarbsG / durationHours : 0;
  const sodiumPerHour = durationHours > 0 ? totalSodiumMg / durationHours : 0;

  // Create log
  const [log] = await db.insert(schema.nutritionLogs).values({
    activityId,
    userId,
    nutritionProtocolId: protocolId,
    followedExactly: true,
    carbsPerHour: carbsPerHour.toFixed(2),
    sodiumPerHour: sodiumPerHour.toFixed(2),
    totalCarbsG: totalCarbsG.toFixed(2),
    totalSodiumMg: totalSodiumMg.toFixed(2),
    totalCaffeineMg: totalCaffeineMg.toFixed(2),
    totalKcal: Math.round(totalKcal),
  }).returning();

  // Insert items
  for (const item of protocolItems) {
    await db.insert(schema.nutritionItems).values({
      logId: log!.id,
      phase: item.phase,
      minuteOffset: item.minuteOffset ?? null,
      productName: item.productName,
      brand: item.brand ?? null,
      quantity: item.quantity?.toString() ?? null,
      unit: item.unit ?? null,
      carbsG: item.carbsG?.toString() ?? null,
      sodiumMg: item.sodiumMg?.toString() ?? null,
      caffeineMg: item.caffeineMg?.toString() ?? null,
      kcal: item.kcal ?? null,
      source: 'protocol',
    });
  }

  return log!;
}

// ── getComparison ─────────────────────────────────────────────────
// Compara prescrito vs consumido para uma atividade
export async function getComparison(userId: string, activityId: string) {
  // Get activity with planned workout
  const activity = await db.query.activities.findFirst({
    where: and(eq(schema.activities.id, activityId), eq(schema.activities.userId, userId)),
    with: { plannedWorkout: { with: { nutritionProtocol: true } } },
  });
  if (!activity) throw { code: 'ERR_ACTIVITY_NOT_FOUND', message: 'Atividade nao encontrada', status: 404 };

  // Get nutrition log
  const log = await db.query.nutritionLogs.findFirst({
    where: and(eq(schema.nutritionLogs.activityId, activityId), eq(schema.nutritionLogs.userId, userId)),
    with: { items: true },
  });

  const protocol = activity.plannedWorkout?.nutritionProtocol ?? null;
  const durationHours = (activity.durationSec ?? 0) / 3600;

  // Prescribed totals
  const prescribed = protocol ? {
    totalCarbsG: Number(protocol.totalCarbsG ?? 0),
    totalSodiumMg: Number(protocol.totalSodiumMg ?? 0),
    totalCaffeineMg: Number(protocol.totalCaffeineMg ?? 0),
    totalKcal: Number(protocol.totalKcal ?? 0),
    items: protocol.items,
  } : null;

  // Actual totals
  const actual = log ? {
    totalCarbsG: Number(log.totalCarbsG ?? 0),
    totalSodiumMg: Number(log.totalSodiumMg ?? 0),
    totalCaffeineMg: Number(log.totalCaffeineMg ?? 0),
    totalKcal: Number(log.totalKcal ?? 0),
    followedExactly: log.followedExactly,
    items: log.items,
  } : null;

  // Metrics
  const actualCarbsPerHour = actual && durationHours > 0 ? actual.totalCarbsG / durationHours : 0;
  const actualSodiumPerHour = actual && durationHours > 0 ? actual.totalSodiumMg / durationHours : 0;
  const prescribedCarbsPerHour = prescribed && durationHours > 0 ? prescribed.totalCarbsG / durationHours : 0;

  // Status indicators
  function getStatus(actual: number, target: number): 'green' | 'yellow' | 'red' {
    if (target === 0) return 'green';
    const ratio = actual / target;
    if (ratio >= 0.85 && ratio <= 1.15) return 'green';
    if (ratio >= 0.6 && ratio < 0.85) return 'yellow';
    return 'red';
  }

  return {
    prescribed,
    actual,
    metrics: {
      carbsPerHour: Number(actualCarbsPerHour.toFixed(1)),
      sodiumPerHour: Number(actualSodiumPerHour.toFixed(1)),
      prescribedCarbsPerHour: Number(prescribedCarbsPerHour.toFixed(1)),
    },
    status: prescribed && actual ? {
      carbs: getStatus(actual.totalCarbsG, prescribed.totalCarbsG),
      sodium: getStatus(actual.totalSodiumMg, prescribed.totalSodiumMg),
      caffeine: getStatus(actual.totalCaffeineMg, prescribed.totalCaffeineMg),
      kcal: getStatus(actual.totalKcal, prescribed.totalKcal),
    } : null,
    protocolId: protocol?.id ?? null,
  };
}

// ── getTrends ─────────────────────────────────────────────────────
// Retorna dados de tendencia nutricional para graficos

export async function getTrends(userId: string, days: number, discipline: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Busca logs com atividades
  const logs = await db.query.nutritionLogs.findMany({
    where: and(
      eq(schema.nutritionLogs.userId, userId),
      gte(schema.nutritionLogs.createdAt, cutoff),
    ),
    orderBy: [desc(schema.nutritionLogs.createdAt)],
  });

  // Busca atividades para filtrar por disciplina
  const activityIds = logs.map((l) => l.activityId);
  if (activityIds.length === 0) return [];

  const activities = await db.query.activities.findMany({
    where: and(
      eq(schema.activities.userId, userId),
      gte(schema.activities.startedAt, cutoff),
    ),
    orderBy: [desc(schema.activities.startedAt)],
  });

  const activityMap = new Map(activities.map((a) => [a.id, a]));

  // Monta dados de tendencia
  const trends = [];
  for (const log of logs) {
    const activity = activityMap.get(log.activityId);
    if (!activity) continue;
    if (discipline !== 'all' && activity.discipline !== discipline) continue;

    trends.push({
      date: activity.startedAt.toISOString().split('T')[0],
      carbsPerHour: Number(log.carbsPerHour ?? 0),
      sodiumPerHour: Number(log.sodiumPerHour ?? 0),
      adherenceScore: Number(log.adherenceScore ?? 0),
    });
  }

  return trends;
}

// ── getReadinessScore ─────────────────────────────────────────────
// Calcula score consolidado de prontidao nutricional

export async function getReadinessScore(userId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const logs = await db.query.nutritionLogs.findMany({
    where: and(
      eq(schema.nutritionLogs.userId, userId),
      gte(schema.nutritionLogs.createdAt, cutoff),
    ),
  });

  if (logs.length === 0) return { score: 0 };

  // Media ponderada: adherence score (60%) + consistencia de logging (40%)
  let totalAdherence = 0;
  let logsWithScore = 0;

  for (const log of logs) {
    const score = Number(log.adherenceScore ?? 0);
    if (score > 0) {
      totalAdherence += score;
      logsWithScore++;
    }
  }

  const avgAdherence = logsWithScore > 0 ? totalAdherence / logsWithScore : 0;

  // Consistencia: % de atividades com log de nutricao nos ultimos 30 dias
  const activities = await db.query.activities.findMany({
    where: and(
      eq(schema.activities.userId, userId),
      gte(schema.activities.startedAt, cutoff),
    ),
  });

  const consistencyPct = activities.length > 0
    ? Math.min(100, (logs.length / activities.length) * 100)
    : 0;

  const score = avgAdherence * 0.6 + consistencyPct * 0.4;

  return { score: Math.round(score * 100) / 100 };
}
