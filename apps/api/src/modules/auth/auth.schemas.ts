import { z } from 'zod';

// ── Request Schemas ─────────────────────────────────────────────

export const registerBody = z.object({
  email: z
    .string()
    .email('Email invalido')
    .max(255, 'Email deve ter no maximo 255 caracteres')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Senha deve ter no minimo 8 caracteres')
    .max(128, 'Senha deve ter no maximo 128 caracteres'),
  name: z
    .string()
    .max(255, 'Nome deve ter no maximo 255 caracteres')
    .optional(),
});

export const loginBody = z.object({
  email: z
    .string()
    .email('Email invalido')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Senha e obrigatoria'),
});

export const refreshBody = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token e obrigatorio'),
});

// ── Response Schemas ────────────────────────────────────────────

export const userResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.string(),
});

export const authResponse = z.object({
  data: z.object({
    user: userResponse,
    token: z.string(),
    refreshToken: z.string(),
  }),
});

// ── Types ───────────────────────────────────────────────────────

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
export type RefreshBody = z.infer<typeof refreshBody>;
export type AuthResponse = z.infer<typeof authResponse>;
export type UserResponse = z.infer<typeof userResponse>;
