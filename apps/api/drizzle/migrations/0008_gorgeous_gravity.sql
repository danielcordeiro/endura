-- Modulo de contexto pessoal/saude: health_profile (1:1) + health_exams (N:1).
-- Idempotente (IF NOT EXISTS / DO blocks) por causa do historico de drift de
-- journal/snapshot. As linhas de race_goals que o generate re-emitiu (priority/
-- location/notes) foram REMOVIDAS: ja existem em prod via 0007_race_calendar.
CREATE TABLE IF NOT EXISTS "health_exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_type" varchar(40) NOT NULL,
	"title" varchar(255),
	"status" varchar(20) DEFAULT 'requested' NOT NULL,
	"provider" varchar(255),
	"exam_date" date,
	"result_date" date,
	"items" jsonb,
	"summary" text,
	"data" jsonb,
	"attachment_ref" varchar(500),
	"created_by_key_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"providers" jsonb,
	"health_plan" jsonb,
	"allergies" text[],
	"medications" jsonb,
	"conditions" text[],
	"notes" text,
	"updated_by_key_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "health_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "health_exams" ADD CONSTRAINT "health_exams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "health_exams" ADD CONSTRAINT "health_exams_created_by_key_id_api_keys_id_fk" FOREIGN KEY ("created_by_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "health_profile" ADD CONSTRAINT "health_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "health_profile" ADD CONSTRAINT "health_profile_updated_by_key_id_api_keys_id_fk" FOREIGN KEY ("updated_by_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_health_exams_user_date" ON "health_exams" USING btree ("user_id","exam_date");
