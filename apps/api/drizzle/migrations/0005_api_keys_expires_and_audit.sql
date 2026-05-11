-- Fase 0 da API publica para agentes IA externos:
-- 1) Adiciona expiracao opcional nas API Keys.
-- 2) Cria tabela de audit log para operacoes de escrita via API Key.

ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
--> statement-breakpoint

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
  ALTER TABLE "api_audit_logs"
    ADD CONSTRAINT "api_audit_logs_api_key_id_api_keys_id_fk"
    FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "api_audit_logs"
    ADD CONSTRAINT "api_audit_logs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_api_audit_logs_user_created"
  ON "api_audit_logs" USING btree ("user_id", "created_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_api_audit_logs_key_created"
  ON "api_audit_logs" USING btree ("api_key_id", "created_at");
