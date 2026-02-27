import { z } from 'zod';

export const planIdParams = z.object({
  id: z.string().uuid('id deve ser um UUID valido'),
});

export const simulateBody = z.object({
  raceGoalId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  targetTimeSec: z.number().int().positive().optional(),
  distance: z.string().optional(),
  weatherConditions: z.object({
    tempC: z.number().optional(),
    humidity: z.number().min(0).max(100).optional(),
    wind: z.string().optional(),
  }).optional(),
});

export type SimulateBody = z.infer<typeof simulateBody>;

export const updatePlanBody = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['draft', 'tested', 'race_ready']).optional(),
  plan: z.unknown().optional(),
});

export type UpdatePlanBody = z.infer<typeof updatePlanBody>;

export const testPlanParams = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
});
