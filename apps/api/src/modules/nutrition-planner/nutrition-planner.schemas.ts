import { z } from 'zod';

export const workoutIdParams = z.object({
  workoutId: z.string().uuid('workoutId deve ser um UUID valido'),
});

export const protocolIdParams = z.object({
  protocolId: z.string().uuid('protocolId deve ser um UUID valido'),
});

export const customizeProtocolBody = z.object({
  items: z.array(z.object({
    phase: z.enum(['pre', 'during', 'post']),
    minuteOffset: z.number().int().optional(),
    productName: z.string().min(1),
    brand: z.string().optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().optional(),
    carbsG: z.number().min(0).optional(),
    sodiumMg: z.number().min(0).optional(),
    caffeineMg: z.number().min(0).optional(),
    kcal: z.number().int().min(0).optional(),
  })).min(1, 'Protocolo deve conter pelo menos um item'),
});

export type CustomizeProtocolBody = z.infer<typeof customizeProtocolBody>;
