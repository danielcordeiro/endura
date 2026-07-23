CREATE TABLE "activity_streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"time_sec" jsonb NOT NULL,
	"watts" jsonb,
	"heart_rate" jsonb,
	"cadence" jsonb,
	"distance_m" jsonb,
	"altitude_m" jsonb,
	"velocity_ms" jsonb,
	"grade_pct" jsonb,
	"moving" jsonb,
	"temp_c" jsonb,
	"sample_count" integer NOT NULL,
	"source" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "activity_streams_activity_id_unique" UNIQUE("activity_id")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "tss" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "has_streams" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_streams" ADD CONSTRAINT "activity_streams_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;