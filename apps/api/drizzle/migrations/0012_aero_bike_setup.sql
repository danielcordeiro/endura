-- Setup aerodinâmico no perfil do atleta (estimativa de CdA por pedalada).
-- Idempotente (ADD COLUMN IF NOT EXISTS): seguro re-rodar — ver CLAUDE.md
-- sobre drift de snapshot do Drizzle e o preDeployCommand do Render.
ALTER TABLE "athlete_profiles" ADD COLUMN IF NOT EXISTS "bike_weight_kg" numeric(4, 2);
ALTER TABLE "athlete_profiles" ADD COLUMN IF NOT EXISTS "crr" numeric(5, 4);
ALTER TABLE "athlete_profiles" ADD COLUMN IF NOT EXISTS "drivetrain_efficiency" numeric(4, 3);
