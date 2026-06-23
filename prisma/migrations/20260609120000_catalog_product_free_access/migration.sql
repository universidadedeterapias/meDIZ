-- Acesso gratuito configurável por produto no admin
ALTER TABLE "catalog_products" ADD COLUMN "free_access" BOOLEAN NOT NULL DEFAULT false;

-- Mantém comportamento anterior da audioterapia "Dor Existencial"
UPDATE "catalog_products"
SET "free_access" = true
WHERE "section" = 'AUDIOTERAPIA'
  AND LOWER("title") LIKE '%dor existencial%';
