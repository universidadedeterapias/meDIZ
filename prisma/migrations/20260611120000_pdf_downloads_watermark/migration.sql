-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cpf" VARCHAR(14);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pdf_downloads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" VARCHAR(36),
    "file_label" VARCHAR(255) NOT NULL,
    "client_ip" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pdf_download_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "jti" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_download_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pdf_downloads_user_id_created_at_idx" ON "pdf_downloads"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pdf_download_tokens_jti_key" ON "pdf_download_tokens"("jti");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pdf_download_tokens_user_id_expires_at_idx" ON "pdf_download_tokens"("user_id", "expires_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "pdf_downloads" ADD CONSTRAINT "pdf_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "pdf_download_tokens" ADD CONSTRAINT "pdf_download_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
