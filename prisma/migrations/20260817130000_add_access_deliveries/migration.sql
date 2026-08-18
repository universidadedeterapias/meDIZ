-- Registro das tentativas de avisar o cliente que o acesso esta liberado.
--
-- Hoje a chamada ao n8n e fire-and-forget: falhou, sai um warn no log e a
-- recuperacao e um admin reenviando na mao. Com esta tabela a entrega vira
-- estado consultavel e reprocessavel, e a propria tabela e a fila
-- (status = 'pending' e trabalho a fazer).
--
-- Puramente aditiva: cria uma tabela nova e nao altera nenhuma existente, entao
-- pode ser aplicada com a versao antiga do app no ar.

-- CreateTable
CREATE TABLE IF NOT EXISTS "access_deliveries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "purchase_event_id" TEXT,
    "kind" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),
    "payload" JSONB NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "access_deliveries_status_created_at_idx"
    ON "access_deliveries"("status", "created_at");

CREATE INDEX IF NOT EXISTS "access_deliveries_email_idx"
    ON "access_deliveries"("email");

CREATE INDEX IF NOT EXISTS "access_deliveries_purchase_event_id_idx"
    ON "access_deliveries"("purchase_event_id");
