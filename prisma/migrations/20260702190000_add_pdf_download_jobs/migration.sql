CREATE TYPE "PdfDownloadJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED');

CREATE TABLE "pdf_download_jobs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "product_id" VARCHAR(36) NOT NULL,
  "status" "PdfDownloadJobStatus" NOT NULL DEFAULT 'PENDING',
  "dedupe_key" VARCHAR(160) NOT NULL,
  "watermark_version" VARCHAR(16) NOT NULL DEFAULT 'v1',
  "locale" VARCHAR(8) NOT NULL DEFAULT 'pt-BR',
  "source_media_file" TEXT NOT NULL,
  "source_permission" VARCHAR(32) NOT NULL,
  "file_label" VARCHAR(255) NOT NULL,
  "r2_key" TEXT,
  "file_name" VARCHAR(160),
  "size_bytes" INTEGER,
  "error_code" VARCHAR(80),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "counted_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pdf_download_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pdf_download_jobs_dedupe_key_key" ON "pdf_download_jobs"("dedupe_key");
CREATE INDEX "pdf_download_jobs_user_id_created_at_idx" ON "pdf_download_jobs"("user_id", "created_at");
CREATE INDEX "pdf_download_jobs_user_id_product_id_status_idx" ON "pdf_download_jobs"("user_id", "product_id", "status");
CREATE INDEX "pdf_download_jobs_status_created_at_idx" ON "pdf_download_jobs"("status", "created_at");
CREATE INDEX "pdf_download_jobs_expires_at_idx" ON "pdf_download_jobs"("expires_at");

ALTER TABLE "pdf_download_jobs"
  ADD CONSTRAINT "pdf_download_jobs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
