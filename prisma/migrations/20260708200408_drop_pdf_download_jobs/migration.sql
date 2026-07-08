-- Reverte a arquitetura assíncrona de download (fila/worker), mantida em
-- 20260702190000_add_pdf_download_jobs. PdfDownload e PdfDownloadToken
-- (fluxo síncrono) não são afetados.

ALTER TABLE "pdf_download_jobs" DROP CONSTRAINT "pdf_download_jobs_user_id_fkey";

DROP TABLE "pdf_download_jobs";

DROP TYPE "PdfDownloadJobStatus";
