import { z } from 'zod';

// ── Parametros de rota ────────────────────────────────────────────

export const activityIdParams = z.object({
  activityId: z.string().uuid('activityId deve ser um UUID valido'),
});

export const itemIdParams = z.object({
  activityId: z.string().uuid('activityId deve ser um UUID valido'),
  itemId: z.string().uuid('itemId deve ser um UUID valido'),
});

export const presetIdParams = z.object({
  id: z.string().uuid('id deve ser um UUID valido'),
});

// ── Item de nutricao ──────────────────────────────────────────────

const nutritionItemBase = z.object({
  phase: z.enum(['pre', 'during', 'post']),
  minuteOffset: z.number().int().optional(),
  productName: z.string().min(1, 'Nome do produto e obrigatorio'),
  brand: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['g', 'ml', 'unit']).optional(),
  carbsG: z.number().min(0).optional(),
  sodiumMg: z.number().min(0).optional(),
  caffeineMg: z.number().min(0).optional(),
  kcal: z.number().int().min(0).optional(),
  source: z.enum(['manual', 'protocol', 'ocr', 'agent']).optional().default('manual'),
});

export const createItemBody = nutritionItemBase.strict();
export const updateItemBody = nutritionItemBase.partial().strict();

export const bulkItemsBody = z.object({
  items: z.array(nutritionItemBase).min(1, 'items nao pode ser vazio').max(30, 'Max 30 items por chamada'),
}).strict();

export type CreateItemBody = z.infer<typeof createItemBody>;
export type UpdateItemBody = z.infer<typeof updateItemBody>;
export type BulkItemsBody = z.infer<typeof bulkItemsBody>;

// ── Preset de suplementacao ───────────────────────────────────────

const presetItem = z.object({
  phase: z.enum(['pre', 'during', 'post']),
  minuteOffset: z.number().int().optional(),
  productName: z.string().min(1),
  brand: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['g', 'ml', 'unit']).optional(),
  carbsG: z.number().min(0).optional(),
  sodiumMg: z.number().min(0).optional(),
  caffeineMg: z.number().min(0).optional(),
  kcal: z.number().int().min(0).optional(),
});

export const createPresetBody = z.object({
  name: z.string().min(1, 'Nome do preset e obrigatorio').max(100),
  items: z.array(presetItem).min(1, 'Preset deve conter pelo menos um item'),
});

export type CreatePresetBody = z.infer<typeof createPresetBody>;

// ── Busca no catalogo de produtos ───────────────────────────────

export const catalogSearchQuery = z.object({
  q: z.string().min(2, 'Busca deve ter pelo menos 2 caracteres'),
  category: z.enum(['gel', 'isotonic', 'bar', 'salt_capsule', 'caffeine', 'other']).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type CatalogSearchQuery = z.infer<typeof catalogSearchQuery>;

// ── Follow protocol (1 tap) ─────────────────────────────────────

export const followProtocolBody = z.object({
  protocolId: z.string().uuid('protocolId deve ser um UUID valido'),
});

export type FollowProtocolBody = z.infer<typeof followProtocolBody>;

// ── Trends query ────────────────────────────────────────────────

export const trendsQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
  discipline: z.string().default('all'),
});
