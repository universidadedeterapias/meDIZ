-- Lista de faixas (vários áudios / idiomas por produto)
ALTER TABLE "catalog_products" ADD COLUMN "media_items" JSONB;
