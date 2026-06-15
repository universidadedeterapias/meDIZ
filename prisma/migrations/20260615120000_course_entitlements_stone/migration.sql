-- Stone / cursos: vínculo produto catálogo ↔ SKU Stone + entitlements por e-mail

ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "stone_product_id" VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_products_stone_product_id_key"
  ON "catalog_products"("stone_product_id");

CREATE TABLE IF NOT EXISTS "course_entitlements" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "catalog_product_id" TEXT NOT NULL,
    "source" VARCHAR(32) NOT NULL DEFAULT 'stone',
    "external_transaction_id" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "course_entitlements_external_transaction_id_key"
  ON "course_entitlements"("external_transaction_id");

CREATE UNIQUE INDEX IF NOT EXISTS "course_entitlements_email_catalog_product_id_key"
  ON "course_entitlements"("email", "catalog_product_id");

CREATE INDEX IF NOT EXISTS "course_entitlements_email_idx"
  ON "course_entitlements"("email");

DO $$ BEGIN
  ALTER TABLE "course_entitlements"
    ADD CONSTRAINT "course_entitlements_catalog_product_id_fkey"
    FOREIGN KEY ("catalog_product_id") REFERENCES "catalog_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
