-- Livro impresso a despachar. Aditiva: cria tabela nova, nao toca em nada existente.
CREATE TABLE "book_shipments" (
    "id" TEXT NOT NULL,
    "purchase_event_id" TEXT,
    "user_id" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "nome" VARCHAR(255),
    "telefone" VARCHAR(40),
    "provider" VARCHAR(32) NOT NULL,
    "external_transaction_id" VARCHAR(120) NOT NULL,
    "external_product_id" VARCHAR(120),
    "status" VARCHAR(32) NOT NULL DEFAULT 'aguardando_postagem',
    "tracking_code" VARCHAR(60),
    "carrier" VARCHAR(32),
    "tracking_url" VARCHAR(500),
    "last_status_label" VARCHAR(255),
    "events" JSONB,
    "posted_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_shipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_shipments_provider_external_transaction_id_key" ON "book_shipments"("provider", "external_transaction_id");
CREATE INDEX "book_shipments_status_created_at_idx" ON "book_shipments"("status", "created_at");
CREATE INDEX "book_shipments_email_idx" ON "book_shipments"("email");
CREATE INDEX "book_shipments_tracking_code_idx" ON "book_shipments"("tracking_code");
