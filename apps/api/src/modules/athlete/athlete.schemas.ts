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
  distance: z.enum(['sprint', 'olympic', '70.3', 'full']),
  raceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data invalido (YYYY-MM-DD)'),
  goal: z.enum(['finish', 'time']),
  targetTime: z.number().int().positive().nullable().optional(),
  raceName: z.string().max(255).nullable().optional(),
  bikeElevationGainM: z.number().min(0).max(5000).nullable().optional(),
  runElevationGainM: z.number().min(0).max(3000).nullable().optional(),
});

export type CreateRaceGoalBody = z.infer<typeof createRaceGoalBody>;
