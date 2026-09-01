-- Outbox dos eventos de uso que viram variavel de conversa no Chatvolt.
--
-- O corredor reage ao que a pessoa faz, nao ao calendario. Para isso o Chatvolt
-- precisa saber o que ela fez, e quem sabe e o app. Esta tabela e a fila entre os
-- dois: o app grava o fato, o n8n le, resolve a conversa pelo e-mail/telefone e
-- grava a variavel.
--
-- Fila, e nao chamada direta, porque o Chatvolt pode estar fora do ar no instante
-- exato da primeira pesquisa de alguem — e perder esse evento significa a Aline
-- falando generico com quem ja usou o app.
--
-- Aditiva: tabela nova, nao toca em nada existente.
CREATE TABLE IF NOT EXISTS "journey_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_name" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "whatsapp" VARCHAR(40),
    "variables" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "journey_events_status_check"
      CHECK ("status" IN ('pending', 'processing', 'processed', 'failed')),
    CONSTRAINT "journey_events_attempts_check" CHECK ("attempts" >= 0),

    -- Cascata: apagar a conta apaga a fila dela. Evento de uso de quem nao existe
    -- mais nao tem para onde ir, e o pedido de esquecimento tem que alcancar isto
    -- tambem.
    CONSTRAINT "journey_events_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Uma linha por pessoa por evento. O unique nao e otimizacao: e a regra de "so a
-- primeira vez" morando no banco, onde duas abas do app abertas ao mesmo tempo
-- nao conseguem furar. `pesquisa` reaproveita a mesma linha para atualizar a data
-- da ultima, em vez de acumular uma por busca.
CREATE UNIQUE INDEX IF NOT EXISTS "journey_events_user_id_event_name_key"
  ON "journey_events"("user_id", "event_name");

CREATE INDEX IF NOT EXISTS "journey_events_available_at_status_idx"
  ON "journey_events"("available_at", "status");
