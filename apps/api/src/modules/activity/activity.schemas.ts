import { z } from 'zod';

// ── Query para listagem de atividades ──────────────────────────

export const activityListQuery = z.object({
  /** Filtra por disciplina (swim, bike, run, etc.) */
  type: z.string().optional(),
  /** Periodo relativo a data atual */
  period: z.enum(['7d', '30d', '90d']).optional(),
  /** Pagina (1-based) */
  page: z.coerce.number().int().min(1).default(1),
  /** Itens por pagina */
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ActivityListQuery = z.infer<typeof activityListQuery>;

// ── Params para atividade individual ───────────────────────────

export const activityParams = z.object({
  /** UUID da atividade */
  id: z.string().uuid('ID da atividade deve ser um UUID valido'),
});

export type ActivityParams = z.infer<typeof activityParams>;

// ── Body para trocar a bike de uma atividade ───────────────────
// bikeId null = desvincula (volta a resolver pela bike padrão no recompute).
export const setActivityBikeBody = z.object({
  bikeId: z.string().uuid('bikeId deve ser um UUID valido').nullable(),
});

export type SetActivityBikeBody = z.infer<typeof setActivityBikeBody>;
