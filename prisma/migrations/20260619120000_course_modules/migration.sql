-- CreateEnum
CREATE TYPE "CatalogModuleMediaKind" AS ENUM ('VIDEO', 'PDF', 'AUDIO');

-- CreateTable
CREATE TABLE "catalog_course_modules" (
    "id" TEXT NOT NULL,
    "catalog_product_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(2048),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_module_media" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "kind" "CatalogModuleMediaKind" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "media_file_name" VARCHAR(2048) NOT NULL,
    "locale" VARCHAR(10),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_module_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_course_modules_catalog_product_id_sort_order_idx" ON "catalog_course_modules"("catalog_product_id", "sort_order");

-- CreateIndex
CREATE INDEX "catalog_module_media_module_id_sort_order_idx" ON "catalog_module_media"("module_id", "sort_order");

-- AddForeignKey
ALTER TABLE "catalog_course_modules" ADD CONSTRAINT "catalog_course_modules_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_module_media" ADD CONSTRAINT "catalog_module_media_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "catalog_course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
