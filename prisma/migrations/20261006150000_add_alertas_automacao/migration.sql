-- Vigia das automacoes (Story 6.3): registro dos alertas ja mandados no
-- Telegram, para o mesmo problema nao virar uma mensagem a cada 15 minutos.
--
-- Puramente aditiva: uma tabela nova, nenhuma alteracao em tabela existente.

-- CreateTable
CREATE TABLE IF NOT EXISTS "alertas_automacao" (
    "chave" VARCHAR(200) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "gravidade" VARCHAR(16) NOT NULL,
    "detalhe" VARCHAR(2000),
    "vezes" INTEGER NOT NULL DEFAULT 1,
    "primeira_vez_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_vez_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_automacao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "alertas_automacao_ultima_vez_em_idx" ON "alertas_automacao"("ultima_vez_em");

