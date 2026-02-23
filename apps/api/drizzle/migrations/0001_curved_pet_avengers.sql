CREATE TABLE "product_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"serving_size" varchar(50),
	"carbs_g" numeric(6, 2),
	"sodium_mg" numeric(6, 2),
	"caffeine_mg" numeric(6, 2),
	"kcal" integer,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_product_catalog_name_brand" ON "product_catalog" USING btree ("name","brand");