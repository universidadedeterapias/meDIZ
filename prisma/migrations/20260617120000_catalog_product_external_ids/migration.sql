-- CreateTable
CREATE TABLE "catalog_product_external_ids" (
    "id" TEXT NOT NULL,
    "catalog_product_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "external_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "catalog_product_external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_product_external_ids_provider_external_id_key" ON "catalog_product_external_ids"("provider", "external_id");

-- CreateIndex
CREATE INDEX "catalog_product_external_ids_catalog_product_id_idx" ON "catalog_product_external_ids"("catalog_product_id");

-- AddForeignKey
ALTER TABLE "catalog_product_external_ids" ADD CONSTRAINT "catalog_product_external_ids_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
