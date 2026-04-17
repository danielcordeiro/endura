CREATE TABLE "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "key_hash" varchar(64) NOT NULL,
  "key_prefix" varchar(24) NOT NULL,
  "scopes" text[] DEFAULT ARRAY['read:all']::text[],
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "revoked_at" timestamp,
  CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_api_keys_user_active" ON "api_keys" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");
