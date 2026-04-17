-- Idempotente: em envs ja migrados (tag marcada em __drizzle_migrations) o drizzle pula;
-- em envs novos, cria tudo sem conflitar com restos.

CREATE TABLE IF NOT EXISTS "daily_checkins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "feeling" integer NOT NULL,
  "muscle_soreness" integer NOT NULL,
  "injury_note" text,
  "readiness_score" integer,
  "readiness_level" varchar(20),
  "mentor_message" text,
  "recommendation" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "tss" numeric(8, 2) DEFAULT '0',
  "ctl" numeric(8, 2) DEFAULT '0',
  "atl" numeric(8, 2) DEFAULT '0',
  "tsb" numeric(8, 2) DEFAULT '0',
  "hrv_ms" numeric(6, 2),
  "hrv_baseline" numeric(6, 2),
  "resting_hr" integer,
  "sleep_duration_h" numeric(4, 2),
  "sleep_score" integer,
  "sleep_quality" integer,
  "spo2" integer,
  "stress_level" integer,
  "body_battery" integer,
  "weight_kg" numeric(5, 2),
  "fatigue_score" numeric(5, 2),
  "readiness_score" numeric(5, 2),
  "readiness_level" varchar(20),
  "mentor_recommendation" text,
  "source" varchar(20) DEFAULT 'calculated',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fitness_tests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "test_type" varchar(30) NOT NULL,
  "test_date" date NOT NULL,
  "distance_m" numeric(10, 2),
  "duration_sec" integer,
  "avg_power_w" integer,
  "avg_hr" integer,
  "derived_pace" numeric(8, 2),
  "derived_ftp" integer,
  "derived_vo2max" numeric(6, 2),
  "notes" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "planned_workouts" ALTER COLUMN "plan_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "race_goals" ADD COLUMN IF NOT EXISTS "bike_elevation_gain_m" numeric(8, 2);
--> statement-breakpoint
ALTER TABLE "race_goals" ADD COLUMN IF NOT EXISTS "run_elevation_gain_m" numeric(8, 2);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_checkins_user_id_users_id_fk') THEN
    ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_metrics_user_id_users_id_fk') THEN
    ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fitness_tests_user_id_users_id_fk') THEN
    ALTER TABLE "fitness_tests" ADD CONSTRAINT "fitness_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_checkins_user_date" ON "daily_checkins" USING btree ("user_id","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_metrics_user_date" ON "daily_metrics" USING btree ("user_id","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fitness_tests_user_type" ON "fitness_tests" USING btree ("user_id","test_type");
