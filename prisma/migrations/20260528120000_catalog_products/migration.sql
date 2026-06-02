-- CreateEnum
CREATE TYPE "CatalogSection" AS ENUM ('BIBLIOTECA', 'AUDIOTERAPIA');

-- CreateEnum
CREATE TYPE "CatalogPermissionKey" AS ENUM ('LIVRO_DIGITAL', 'PDF', 'AUDIOTERAPIA');

-- CreateTable
CREATE TABLE "catalog_products" (
    "id" TEXT NOT NULL,
    "section" "CatalogSection" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "tag_label" VARCHAR(80),
    "cover_image_url" TEXT,
    "purchase_url" TEXT NOT NULL,
    "permission_key" "CatalogPermissionKey" NOT NULL,
    "pdf_index" INTEGER NOT NULL DEFAULT 0,
    "unlocked_label" VARCHAR(80),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_products_section_active_sort_order_idx" ON "catalog_products"("section", "active", "sort_order");
