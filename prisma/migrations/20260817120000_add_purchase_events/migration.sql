-- Registro cru das compras recebidas por webhook, com fila de nao mapeados.
--
-- Hoje uma compra de produto sem mapeamento responde 200 com "ignored: true": a
-- plataforma considera entregue, o cliente pagou e ninguem fica sabendo. Esta
-- tabela guarda a venda antes de qualquer tentativa de liberar acesso, entao o
-- caso vira uma linha com status 'pending_mapping' visivel no admin.
--
-- Puramente aditiva: cria uma tabela nova e nao altera nenhuma existente, entao
-- pode ser aplicada com a versao antiga do app no ar.

-- CreateTable
CREATE TABLE IF NOT EXISTS "purchase_events" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "event_type" VARCHAR(120),
    "external_transaction_id" VARCHAR(120) NOT NULL,
    "external_product_id" VARCHAR(120),
    "external_product_name" VARCHAR(255),
    "email" VARCHAR(255),
    "nome" VARCHAR(255),
    "telefone" VARCHAR(40),
    "cpf" VARCHAR(20),
    "currency" VARCHAR(10),
    "country" VARCHAR(10),
    "status" VARCHAR(32) NOT NULL DEFAULT 'received',
    "catalog_product_id" TEXT,
    "reason" VARCHAR(255),
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "purchase_events_pkey" PRIMARY KEY ("id")
);

-- Reentrega do mesmo webhook atualiza a linha em vez de duplicar a venda.
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_events_provider_external_transaction_id_key"
    ON "purchase_events"("provider", "external_transaction_id");

CREATE INDEX IF NOT EXISTS "purchase_events_status_created_at_idx"
    ON "purchase_events"("status", "created_at");

CREATE INDEX IF NOT EXISTS "purchase_events_email_idx"
    ON "purchase_events"("email");

CREATE INDEX IF NOT EXISTS "purchase_events_external_product_id_idx"
    ON "purchase_events"("external_product_id");
