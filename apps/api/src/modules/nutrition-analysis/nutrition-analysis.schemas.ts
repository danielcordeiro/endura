import { z } from 'zod';

export const activityIdParams = z.object({
  activityId: z.string().uuid('activityId deve ser um UUID valido'),
});

export const patternsQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});
