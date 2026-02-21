import { z } from 'zod';

// ── Body para gerar plano (vazio — dados vem do perfil) ─────────

export const generatePlanBody = z.object({}).optional();

export type GeneratePlanBody = z.infer<typeof generatePlanBody>;

// ── Body para chat com o plano ──────────────────────────────────

export const chatBody = z.object({
  message: z.string().min(1, 'Mensagem nao pode ser vazia').max(2000, 'Mensagem muito longa'),
});

export type ChatBody = z.infer<typeof chatBody>;

// ── Params para semana do plano ─────────────────────────────────

export const weekParams = z.object({
  weekNumber: z.coerce.number().int().min(1, 'Numero da semana deve ser >= 1'),
});

export type WeekParams = z.infer<typeof weekParams>;

// ── Params para treino especifico ───────────────────────────────

export const workoutParams = z.object({
  id: z.string().uuid('ID do treino deve ser um UUID valido'),
});

export type WorkoutParams = z.infer<typeof workoutParams>;

// ── Params para envio ao relogio ────────────────────────────────

export const sendToWatchParams = z.object({
  id: z.string().uuid('ID do treino deve ser um UUID valido'),
});

export type SendToWatchParams = z.infer<typeof sendToWatchParams>;
