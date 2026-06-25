-- Calendário de provas: prioridade (A/B/C), local e notas em race_goals.
-- Idempotente (ADD COLUMN IF NOT EXISTS) por causa do histórico de drift de journal/snapshot.
ALTER TABLE "race_goals" ADD COLUMN IF NOT EXISTS "priority" varchar(1) DEFAULT 'A';--> statement-breakpoint
ALTER TABLE "race_goals" ADD COLUMN IF NOT EXISTS "location" varchar(255);--> statement-breakpoint
ALTER TABLE "race_goals" ADD COLUMN IF NOT EXISTS "notes" text;
