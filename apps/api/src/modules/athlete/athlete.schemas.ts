import { z } from 'zod';

// ── Profile schemas ─────────────────────────────────────────────

export const createProfileBody = z.object({
  // Bloco 1: Perfil atlético
  level: z.enum(['iniciante', 'intermediario', 'competitivo']),
  weakestDiscipline: z.enum(['swim', 'bike', 'run']).nullable().optional(),
  weeklyHours: z.number().min(1).max(40).nullable().optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  hasPool: z.boolean().optional().default(false),
  hasBikeTrainer: z.boolean().optional().default(false),
  hasTreadmill: z.boolean().optional().default(false),

  // Bloco 2: Dados fisiológicos
  weightKg: z.number().min(30).max(200).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  maxHr: z.number().int().min(100).max(250).nullable().optional(),
  ftpWatts: z.number().int().min(50).max(600).nullable().optional(),
  run5kPaceSec: z.number().int().min(180).max(900).nullable().optional(),

  // Bloco 2b: Setup aerodinâmico (estimativa de CdA por pedalada)
  bikeWeightKg: z.number().min(3).max(25).nullable().optional(),
  crr: z.number().min(0.001).max(0.02).nullable().optional(), // resolvido de preset de pneu/piso no UI
  drivetrainEfficiency: z.number().min(0.9).max(1).nullable().optional(),

  // Bloco 3: Perfil nutricional
  dietaryRestrictions: z.array(z.string()).nullable().optional(),
  ownedProducts: z.array(z.string()).nullable().optional(),
  giSensitivity: z.boolean().optional().default(false),
  sweatRateHigh: z.boolean().optional().default(false),
  crampsHistory: z.boolean().optional().default(false),
});

export const updateProfileBody = createProfileBody.partial();

export type CreateProfileBody = z.infer<typeof createProfileBody>;
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

// ── Race goal schemas ───────────────────────────────────────────

export const createRaceGoalBody = z.object({
  // Triathlon + provas avulsas de preparação (corrida/ciclismo) para o calendário.
  distance: z.enum([
    'sprint', 'olympic', '70.3', 'full',
    'run_5k', 'run_10k', 'run_21k', 'run_42k',
    'bike_event', 'swim_event', 'other',
  ]),
  raceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data invalido (YYYY-MM-DD)'),
  goal: z.enum(['finish', 'time']),
  targetTime: z.number().int().positive().nullable().optional(),
  raceName: z.string().max(255).nullable().optional(),
  bikeElevationGainM: z.number().min(0).max(5000).nullable().optional(),
  runElevationGainM: z.number().min(0).max(3000).nullable().optional(),
  // Calendário de provas
  priority: z.enum(['A', 'B', 'C']).optional().default('A'),
  location: z.string().max(255).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type CreateRaceGoalBody = z.infer<typeof createRaceGoalBody>;

// Atualização parcial de uma prova do calendário (inclui active para arquivar)
export const updateRaceGoalBody = createRaceGoalBody.partial().extend({
  active: z.boolean().optional(),
});

export type UpdateRaceGoalBody = z.infer<typeof updateRaceGoalBody>;
