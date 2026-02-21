import { z } from 'zod';

// ── Request Schemas ─────────────────────────────────────────────

export const callbackQuery = z.object({
  code: z
    .string()
    .min(1, 'Codigo de autorizacao e obrigatorio'),
  state: z
    .string()
    .uuid('State CSRF invalido'),
});

// ── Response Schemas ────────────────────────────────────────────

export const connectResponse = z.object({
  data: z.object({
    authUrl: z.string().url(),
  }),
});

export const statusResponse = z.object({
  data: z.object({
    connected: z.boolean(),
    provider: z.string(),
    externalUserId: z.string().nullable(),
    lastSyncAt: z.string().datetime().nullable(),
    syncStatus: z.string().nullable(),
  }),
});

export const disconnectResponse = z.object({
  data: z.object({
    message: z.string(),
  }),
});

export const syncAcceptedResponse = z.object({
  data: z.object({
    message: z.string(),
    status: z.literal('accepted'),
  }),
});

export const errorResponse = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number(),
});

// ── Types ───────────────────────────────────────────────────────

export type CallbackQuery = z.infer<typeof callbackQuery>;
export type ConnectResponse = z.infer<typeof connectResponse>;
export type StatusResponse = z.infer<typeof statusResponse>;
export type DisconnectResponse = z.infer<typeof disconnectResponse>;
export type SyncAcceptedResponse = z.infer<typeof syncAcceptedResponse>;
export type ErrorResponse = z.infer<typeof errorResponse>;
