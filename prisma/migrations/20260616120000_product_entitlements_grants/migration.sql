-- Fase 1: entitlements granulares, Hotmart ID no catálogo, regras de liberação

CREATE TYPE "PaymentProvider" AS ENUM ('HOTMART', 'STONE', 'FREE');

ALTER TABLE "course_entitlements" RENAME TO "product_entitlements";

ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "hotmart_product_id" VARCHAR(120);
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'HOTMART';

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_products_hotmart_product_id_key"
  ON "catalog_products"("hotmart_product_id");

CREATE TABLE IF NOT EXISTS "catalog_product_grants" (
    "id" TEXT NOT NULL,
    "source_product_id" TEXT NOT NULL,
    "granted_product_id" TEXT NOT NULL,

    CONSTRAINT "catalog_product_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_product_grants_source_product_id_granted_product_id_key"
  ON "catalog_product_grants"("source_product_id", "granted_product_id");

CREATE INDEX IF NOT EXISTS "catalog_product_grants_source_product_id_idx"
  ON "catalog_product_grants"("source_product_id");

DO $$ BEGIN
  ALTER TABLE "catalog_product_grants"
    ADD CONSTRAINT "catalog_product_grants_source_product_id_fkey"
    FOREIGN KEY ("source_product_id") REFERENCES "catalog_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "catalog_product_grants"
    ADD CONSTRAINT "catalog_product_grants_granted_product_id_fkey"
    FOREIGN KEY ("granted_product_id") REFERENCES "catalog_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
