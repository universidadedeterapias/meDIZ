-- Esteira de e-mails pos-compra (ondas 2 a 6). Puramente aditiva: cria tres tabelas
-- novas e nao altera nenhuma existente, entao pode ser aplicada antes do deploy.

-- CreateTable
CREATE TABLE "email_sequence_enrollment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'pt-BR',
    "source" TEXT NOT NULL,
    "external_transaction_id" TEXT NOT NULL,
    "anchor_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sequence_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sequence_send" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sequence_send_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template" (
    "id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "delay_minutes" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "html" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_sequence_enrollment_unsubscribe_token_key" ON "email_sequence_enrollment"("unsubscribe_token");

-- CreateIndex
-- Idempotencia do webhook: retry da Hotmart/Guru nao cria uma segunda inscricao.
CREATE UNIQUE INDEX "email_sequence_enrollment_user_id_external_transaction_id_key" ON "email_sequence_enrollment"("user_id", "external_transaction_id");

-- CreateIndex
-- Query do cron: quem esta ativo e em qual passo parou.
CREATE INDEX "email_sequence_enrollment_status_current_step_idx" ON "email_sequence_enrollment"("status", "current_step");

-- CreateIndex
CREATE INDEX "email_sequence_enrollment_email_idx" ON "email_sequence_enrollment"("email");

-- CreateIndex
-- Garantia de que ninguem recebe o mesmo passo duas vezes, mesmo com cron concorrente.
CREATE UNIQUE INDEX "email_sequence_send_enrollment_id_step_key" ON "email_sequence_send"("enrollment_id", "step");

-- CreateIndex
CREATE INDEX "email_sequence_send_enrollment_id_idx" ON "email_sequence_send"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_template_step_lang_key" ON "email_template"("step", "lang");

-- CreateIndex
CREATE INDEX "email_template_active_step_idx" ON "email_template"("active", "step");

-- AddForeignKey
ALTER TABLE "email_sequence_enrollment" ADD CONSTRAINT "email_sequence_enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_sequence_send" ADD CONSTRAINT "email_sequence_send_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "email_sequence_enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
