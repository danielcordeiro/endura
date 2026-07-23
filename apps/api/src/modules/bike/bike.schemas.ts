import { z } from 'zod';

// ── Schemas de bike (equipamento p/ estimativa de CdA) ───────────

export const createBikeBody = z.object({
  name: z.string().min(1).max(100),
  weightKg: z.number().min(3).max(25).nullable().optional(),
  crr: z.number().min(0.001).max(0.02).nullable().optional(),        // resolvido de preset de pneu no UI
  drivetrainEfficiency: z.number().min(0.9).max(1).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const updateBikeBody = createBikeBody.partial();

export type CreateBikeBody = z.infer<typeof createBikeBody>;
export type UpdateBikeBody = z.infer<typeof updateBikeBody>;
