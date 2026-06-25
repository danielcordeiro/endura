-- Memória do coach (sessões de IA via MCP) + colunas Garmin em daily_metrics.
--
-- Notas sobre o estado do banco (verificado em prod antes de aplicar):
--  • api_keys JÁ existe (criada em 0004) → NÃO recriar aqui.
--  • api_audit_logs NÃO existe em prod: o arquivo 0005 contém o CREATE, mas 0005
--    foi editado APÓS já ter sido aplicado, e o migrator do drizzle não re-roda
--    migrations já aplicadas (gate por timestamp do journal). Então recriamos a
--    tabela aqui (forward fix) — auditoria de escrita via API Key depende dela.
--  • Todos os statements são idempotentes (IF NOT EXISTS / DO-block) por causa
--    dessa defasagem de journal/snapshot.

-- ── api_audit_logs (forward fix: ausente em prod) ──────────────────────
CREATE TABLE IF NOT EXISTS "api_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid,
  "user_id" uuid NOT NULL,
  "method" varchar(10) NOT NULL,
  "path" varchar(255) NOT NULL,
  "status_code" integer NOT NULL,
  "resource_id" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_audit_logs" ADD CONSTRAINT "api_audit_logs_api_key_id_api_keys_id_fk"
    FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_audit_logs" ADD CONSTRAINT "api_audit_logs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_audit_logs_user_created" ON "api_audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_audit_logs_key_created" ON "api_audit_logs" USING btree ("api_key_id","created_at");--> statement-breakpoint

-- ── Memória do coach ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "coach_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"race_goal_id" uuid,
	"type" varchar(30) NOT NULL,
	"title" varchar(255),
	"summary" text NOT NULL,
	"data" jsonb,
	"period_from" date,
	"period_to" date,
	"created_by_key_id" uuid,
	"assessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coach_directives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"text" text NOT NULL,
	"rationale" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"expires_at" timestamp,
	"created_by_key_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coach_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"philosophy" text,
	"constraints" jsonb,
	"current_focus" text,
	"season_goal" text,
	"updated_by_key_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "coach_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

-- ── Colunas Garmin em daily_metrics ───────────────────────────────────
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "vo2max" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "respiration_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "hrv_status" varchar(20);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "intervals_readiness" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "recovery_time_h" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "sleep_deep_h" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "sleep_light_h" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "sleep_rem_h" numeric(4, 2);--> statement-breakpoint

-- ── FKs da memória do coach ───────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "coach_assessments" ADD CONSTRAINT "coach_assessments_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coach_assessments" ADD CONSTRAINT "coach_assessments_race_goal_id_race_goals_id_fk"
    FOREIGN KEY ("race_goal_id") REFERENCES "public"."race_goals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coach_assessments" ADD CONSTRAINT "coach_assessments_created_by_key_id_api_keys_id_fk"
    FOREIGN KEY ("created_by_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coach_directives" ADD CONSTRAINT "coach_directives_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coach_directives" ADD CONSTRAINT "coach_directives_created_by_key_id_api_keys_id_fk"
    FOREIGN KEY ("created_by_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coach_profile" ADD CONSTRAINT "coach_profile_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "coach_profile" ADD CONSTRAINT "coach_profile_updated_by_key_id_api_keys_id_fk"
    FOREIGN KEY ("updated_by_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coach_assessments_user_assessed" ON "coach_assessments" USING btree ("user_id","assessed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coach_directives_user_status" ON "coach_directives" USING btree ("user_id","status");
