-- AlterTable
ALTER TABLE "User" ADD COLUMN "must_reset_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "temporary_password_plain" VARCHAR(32);
ALTER TABLE "User" ADD COLUMN "whatsapp_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "library_permissions" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nome" VARCHAR(255),
    "audioterapia" BOOLEAN NOT NULL DEFAULT false,
    "pdf" BOOLEAN NOT NULL DEFAULT false,
    "livro_digital" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_permissions_email_key" ON "library_permissions"("email");

CREATE INDEX "idx_library_permissions_email_lower" ON "library_permissions"(LOWER("email"));
