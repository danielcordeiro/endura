CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"planned_workout_id" uuid,
	"external_id" varchar(100),
	"source" varchar(20) NOT NULL,
	"discipline" varchar(10) NOT NULL,
	"title" varchar(255),
	"started_at" timestamp NOT NULL,
	"duration_sec" integer,
	"distance_m" numeric(10, 2),
	"avg_hr" integer,
	"max_hr" integer,
	"avg_power_w" integer,
	"elevation_m" numeric(8, 2),
	"calories" integer,
	"lat_start" numeric(10, 7),
	"lon_start" numeric(10, 7),
	"temp_start_c" numeric(5, 2),
	"temp_avg_c" numeric(5, 2),
	"humidity_pct" integer,
	"wind_mps" numeric(5, 2),
	"adverse_events" text[],
	"perceived_effort" integer,
	"notes" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"category" varchar(30) NOT NULL,
	"insight" text NOT NULL,
	"recommendation" text,
	"score" numeric(3, 2),
	"alert_level" varchar(10),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "athlete_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"level" varchar(20) NOT NULL,
	"weakest_discipline" varchar(10),
	"weekly_hours" numeric(4, 1),
	"available_days" integer[],
	"has_pool" boolean DEFAULT false,
	"has_bike_trainer" boolean DEFAULT false,
	"has_treadmill" boolean DEFAULT false,
	"weight_kg" numeric(5, 2),
	"height_cm" integer,
	"max_hr" integer,
	"ftp_watts" integer,
	"run_5k_pace_sec" integer,
	"dietary_restrictions" text[],
	"owned_products" text[],
	"gi_sensitivity" boolean DEFAULT false,
	"sweat_rate_high" boolean DEFAULT false,
	"cramps_history" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coach_athletes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"invite_code" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(30) NOT NULL,
	"external_user_id" varchar(255),
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"expires_at" timestamp,
	"scope" text,
	"last_sync_at" timestamp,
	"sync_status" varchar(20) DEFAULT 'idle',
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nutrition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_id" uuid NOT NULL,
	"phase" varchar(10) NOT NULL,
	"minute_offset" integer,
	"product_name" varchar(255) NOT NULL,
	"brand" varchar(100),
	"quantity" numeric(6, 2),
	"unit" varchar(20),
	"carbs_g" numeric(6, 2),
	"sodium_mg" numeric(6, 2),
	"caffeine_mg" numeric(6, 2),
	"kcal" integer,
	"source" varchar(20) DEFAULT 'manual',
	"confidence" numeric(3, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nutrition_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_carbs_g" numeric(8, 2),
	"total_sodium_mg" numeric(8, 2),
	"total_caffeine_mg" numeric(6, 2),
	"total_kcal" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nutrition_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planned_workout_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"total_carbs_g" numeric(8, 2),
	"total_sodium_mg" numeric(8, 2),
	"total_caffeine_mg" numeric(6, 2),
	"total_kcal" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "planned_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"discipline" varchar(10) NOT NULL,
	"title" varchar(255),
	"description" text,
	"structure" jsonb,
	"duration_min" integer,
	"distance_m" integer,
	"intensity_zone" varchar(10),
	"tss_estimate" numeric(6, 1),
	"sent_to_watch" boolean DEFAULT false,
	"sent_at" timestamp,
	"intervals_workout_id" varchar(100),
	"week" integer,
	"phase" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "race_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"distance" varchar(20) NOT NULL,
	"race_date" date NOT NULL,
	"goal" varchar(20) NOT NULL,
	"target_time_sec" integer,
	"race_name" varchar(255),
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplement_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" varchar(30) NOT NULL,
	"correlation_id" uuid DEFAULT gen_random_uuid(),
	"outcome" varchar(10) NOT NULL,
	"activities_synced" integer DEFAULT 0,
	"error_details" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"race_goal_id" uuid,
	"current_phase" varchar(20),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_weeks" integer,
	"status" varchar(20) DEFAULT 'active',
	"generated_at" timestamp DEFAULT now(),
	"last_adapted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password_hash" text,
	"role" varchar(20) DEFAULT 'athlete' NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"week_number" integer NOT NULL,
	"completed_workouts" integer,
	"total_planned" integer,
	"energy_level" integer,
	"sleep_quality" integer,
	"muscle_soreness" integer,
	"notes" text,
	"plan_adapted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athletes" ADD CONSTRAINT "coach_athletes_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athletes" ADD CONSTRAINT "coach_athletes_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_items" ADD CONSTRAINT "nutrition_items_log_id_nutrition_logs_id_fk" FOREIGN KEY ("log_id") REFERENCES "public"."nutrition_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_protocols" ADD CONSTRAINT "nutrition_protocols_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_goals" ADD CONSTRAINT "race_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_presets" ADD CONSTRAINT "supplement_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_race_goal_id_race_goals_id_fk" FOREIGN KEY ("race_goal_id") REFERENCES "public"."race_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_user_started" ON "activities" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_activities_external_id" ON "activities" USING btree ("external_id","source");--> statement-breakpoint
CREATE INDEX "idx_ai_insights_activity" ON "ai_insights" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_user_provider" ON "integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "idx_nutrition_items_log" ON "nutrition_items" USING btree ("log_id");--> statement-breakpoint
CREATE INDEX "idx_planned_workouts_plan_date" ON "planned_workouts" USING btree ("plan_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_created" ON "sync_logs" USING btree ("created_at");