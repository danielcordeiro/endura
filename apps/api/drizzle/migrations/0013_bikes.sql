CREATE TABLE IF NOT EXISTS "bikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"weight_kg" numeric(4, 2),
	"crr" numeric(5, 4),
	"drivetrain_efficiency" numeric(4, 3),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "bikes" ADD CONSTRAINT "bikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bikes_user" ON "bikes" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "bike_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "activities" ADD CONSTRAINT "activities_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
