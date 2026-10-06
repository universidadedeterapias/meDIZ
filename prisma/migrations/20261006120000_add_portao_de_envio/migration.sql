-- Portao de envio (Story 6.1): todo template pago do WhatsApp passa a sair por
-- POST /api/mensagens/enviar, que grava a chave do envio ANTES de chamar o
-- Chatvolt. Em 05/10/2026 o fim do trial reenviou o mesmo template a cada 30
-- minutos porque o registro do toque falhava depois do envio — mais de mil
-- mensagens pagas repetidas. Com a chave gravada antes, a segunda tentativa
-- volta `ja_enviado` sem enviar.
--
-- Puramente aditiva: tres tabelas novas, nenhuma alteracao em tabela
-- existente, entao pode ser aplicada com a versao antiga do app no ar. Os
-- INSERT so cadastram os fluxos com tetos folgados (cerca de 3x o maior dia
-- observado entre 24/09 e 06/10/2026), para ajustar depois no banco.

-- CreateTable
CREATE TABLE IF NOT EXISTS "mensagens_enviadas" (
    "id" TEXT NOT NULL,
    "chave" VARCHAR(160) NOT NULL,
    "fluxo" VARCHAR(40) NOT NULL,
    "user_id" TEXT,
    "telefone" VARCHAR(24) NOT NULL,
    "template" VARCHAR(80) NOT NULL,
    "idioma" VARCHAR(16),
    "categoria" VARCHAR(16),
    "status" VARCHAR(16) NOT NULL,
    "motivo" VARCHAR(255),
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "corpo" JSONB,
    "http_status" INTEGER,
    "resposta" JSONB,
    "conversation_id" VARCHAR(64),
    "n8n_workflow_id" VARCHAR(40),
    "n8n_execucao_id" VARCHAR(40),
    "tentativa_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensagens_enviadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fluxos_automacao" (
    "fluxo" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ligado" BOOLEAN NOT NULL DEFAULT true,
    "teto_diario" INTEGER NOT NULL,
    "conta_no_limite_pessoa" BOOLEAN NOT NULL DEFAULT true,
    "limite_pessoa_24h" INTEGER NOT NULL DEFAULT 3,
    "observacao" VARCHAR(255),
    "atualizado_por" VARCHAR(120),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxos_automacao_pkey" PRIMARY KEY ("fluxo")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "execucoes_automacao" (
    "id" TEXT NOT NULL,
    "fluxo" VARCHAR(40) NOT NULL,
    "n8n_workflow_id" VARCHAR(40),
    "n8n_execucao_id" VARCHAR(40),
    "iniciou_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminou_em" TIMESTAMP(3),
    "lidos" INTEGER,
    "enviados" INTEGER,
    "barrados" INTEGER,
    "falhas" INTEGER,
    "erro" VARCHAR(500),

    CONSTRAINT "execucoes_automacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mensagens_enviadas_chave_key" ON "mensagens_enviadas"("chave");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensagens_enviadas_telefone_tentativa_em_idx" ON "mensagens_enviadas"("telefone", "tentativa_em");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensagens_enviadas_fluxo_tentativa_em_idx" ON "mensagens_enviadas"("fluxo", "tentativa_em");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensagens_enviadas_status_tentativa_em_idx" ON "mensagens_enviadas"("status", "tentativa_em");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensagens_enviadas_user_id_idx" ON "mensagens_enviadas"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "execucoes_automacao_fluxo_iniciou_em_idx" ON "execucoes_automacao"("fluxo", "iniciou_em");

-- Fluxos que mandam template pago hoje. Fluxo sem linha aqui e barrado.
-- conta_no_limite_pessoa = false: mensagem que a pessoa pediu (acesso,
-- rastreio) nao conta no limite de 24h e nao e barrada por ele.
INSERT INTO "fluxos_automacao"
    ("fluxo", "nome", "ligado", "teto_diario", "conta_no_limite_pessoa", "limite_pessoa_24h", "observacao", "atualizado_por", "atualizado_em")
VALUES
    ('entrega_acesso', 'ENTREGA DE ACESSO', true, 100,  false, 3, 'pico 26/dia', 'migration', CURRENT_TIMESTAMP),
    ('rastreio_livro', 'LIVRO FISICO — aviso de rastreio', true, 200, false, 3, 'pico 63/dia', 'migration', CURRENT_TIMESTAMP),
    ('trial_fim',      'Fim do Trial', true, 150, true, 3, 'ate 32 trials vencendo/dia, 2 toques', 'migration', CURRENT_TIMESTAMP),
    ('despertadores',  'Despertadores (acesso e pesquisa)', true, 300, true, 3, 'pico 103/dia', 'migration', CURRENT_TIMESTAMP),
    ('recuperacao',    'Recuperacao de Vendas', true, 60, true, 3, 'pico ~12/dia com cupom', 'migration', CURRENT_TIMESTAMP),
    ('reativacao',     'Reativacao — ondas', true, 1500, true, 3, 'pico 1167/dia em onda', 'migration', CURRENT_TIMESTAMP)
ON CONFLICT ("fluxo") DO NOTHING;
