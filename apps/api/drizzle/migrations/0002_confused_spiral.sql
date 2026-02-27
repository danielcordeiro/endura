CREATE TABLE "race_nutrition_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"race_goal_id" uuid,
	"name" varchar(255) NOT NULL,
	"target_time_sec" integer,
	"weather_conditions" jsonb,
	"plan" jsonb NOT NULL,
	"totals" jsonb,
	"tested_in_workouts" text[],
	"status" varchar(20) DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "nutrition_protocol_id" uuid;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "followed_exactly" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "carbs_per_hour" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "sodium_per_hour" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "adherence_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "nutrition_protocols" ADD COLUMN "status" varchar(20) DEFAULT 'generated';--> statement-breakpoint
ALTER TABLE "nutrition_protocols" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "nutrition_protocols" ADD COLUMN "weather_context" jsonb;--> statement-breakpoint
ALTER TABLE "race_nutrition_plans" ADD CONSTRAINT "race_nutrition_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_nutrition_plans" ADD CONSTRAINT "race_nutrition_plans_race_goal_id_race_goals_id_fk" FOREIGN KEY ("race_goal_id") REFERENCES "public"."race_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_nutrition_protocol_id_nutrition_protocols_id_fk" FOREIGN KEY ("nutrition_protocol_id") REFERENCES "public"."nutrition_protocols"("id") ON DELETE no action ON UPDATE no action;