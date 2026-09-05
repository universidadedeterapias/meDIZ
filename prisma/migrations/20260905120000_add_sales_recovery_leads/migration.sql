-- Fila das vendas que ficaram no meio do caminho: PIX gerado e nao pago, boleto
-- emitido e nao pago, cartao recusado.
--
-- A propria tabela e a fila, mesmo desenho de access_deliveries: status =
-- 'armado' com disparar_em vencido e trabalho a fazer. Quem consome e o n8n
-- (workflow "Recuperacao de Vendas [meDIZ]"), que le esta tabela, confere em
-- purchase_events se a pessoa ja comprou e so entao dispara o template.
--
-- disparar_em existe porque o evento de pagamento pendente chega no instante em
-- que o QR e gerado: todo comprador passa por esse estado, inclusive quem vai
-- pagar em quarenta segundos. A carencia e o que separa pendente de abandonado.
--
-- Puramente aditiva: cria uma tabela nova e nao altera nenhuma existente, entao
-- pode ser aplicada com a versao antiga do app no ar.

-- CreateTable
CREATE TABLE IF NOT EXISTS "sales_recovery_leads" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "external_transaction_id" VARCHAR(120) NOT NULL,
    "event_type" VARCHAR(120),
    "metodo" VARCHAR(16) NOT NULL,
    "email" VARCHAR(255),
    "telefone" VARCHAR(24),
    "nome" VARCHAR(255),
    "external_product_id" VARCHAR(120),
    "produto_nome" VARCHAR(255),
    "valor" INTEGER,
    "link_pagamento" TEXT,
    "status" VARCHAR(24) NOT NULL DEFAULT 'armado',
    "motivo" VARCHAR(255),
    "conversation_id" VARCHAR(120),
    "toques" INTEGER NOT NULL DEFAULT 0,
    "disparar_em" TIMESTAMP(3) NOT NULL,
    "claim_em" TIMESTAMP(3),
    "ultimo_toque_em" TIMESTAMP(3),
    "cupom_em" TIMESTAMP(3),
    "cupom_enviado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_recovery_leads_pkey" PRIMARY KEY ("id")
);

-- Uma compra gera varios eventos e a plataforma reenvia quando nao recebe 200.
CREATE UNIQUE INDEX IF NOT EXISTS "sales_recovery_leads_provider_external_transaction_id_key"
    ON "sales_recovery_leads"("provider", "external_transaction_id");

CREATE INDEX IF NOT EXISTS "sales_recovery_leads_status_disparar_em_idx"
    ON "sales_recovery_leads"("status", "disparar_em");

CREATE INDEX IF NOT EXISTS "sales_recovery_leads_status_cupom_em_idx"
    ON "sales_recovery_leads"("status", "cupom_em");

CREATE INDEX IF NOT EXISTS "sales_recovery_leads_telefone_ultimo_toque_em_idx"
    ON "sales_recovery_leads"("telefone", "ultimo_toque_em");

CREATE INDEX IF NOT EXISTS "sales_recovery_leads_email_idx"
    ON "sales_recovery_leads"("email");
