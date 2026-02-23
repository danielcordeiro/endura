import { eq, and, gte, lte, or, ilike, sql } from 'drizzle-orm';
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
