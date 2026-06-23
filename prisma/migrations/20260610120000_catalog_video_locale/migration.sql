-- AlterEnum
ALTER TYPE "CatalogPermissionKey" ADD VALUE IF NOT EXISTS 'VIDEO';

-- AlterTable
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "locale" VARCHAR(10);
