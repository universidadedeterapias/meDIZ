-- Allow Cloudinary URLs in media_file_name
ALTER TABLE "catalog_products" ALTER COLUMN "media_file_name" TYPE VARCHAR(2048);
