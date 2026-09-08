-- Ondas de reativacao: o recorte congelado, a isca, o ritmo, e uma linha por
-- pessoa por onda.
--
-- A lista de destinatarios e materializada na criacao e nunca recalculada. Um
-- filtro salvo mudaria de publico sozinho entre o momento em que alguem aprovou
-- e o momento em que a mensagem sai — e aqui isso significa mandar WhatsApp para
-- gente que ninguem revisou. `filtros` guarda o pedido original para auditoria,
-- e nao para reexecutar.
--
-- A tabela de destinatarios e a Regra 5 do plano: sem ela nao existe taxa de
-- conversao por origem, e nao da para parar uma onda no meio.
--
-- Quem envia e o n8n, reivindicando lotes. Por isso `claim_em` e `tentativas`:
-- e o mesmo desenho de journey_events e de sales_recovery_leads.
--
-- Puramente aditiva: cria duas tabelas novas e nao altera nenhuma existente.

-- CreateTable
CREATE TABLE IF NOT EXISTS "reactivation_campaigns" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'rascunho',
    "template_name" VARCHAR(120) NOT NULL,
    "template_lang" VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
    "canal" VARCHAR(24) NOT NULL DEFAULT 'whatsapp_oficial',
    "crm_scenario_id" VARCHAR(120),
    "crm_step_id" VARCHAR(120),
    "filtros" JSONB NOT NULL,
    "corte_dias" INTEGER NOT NULL,
    "teto_diario" INTEGER NOT NULL DEFAULT 700,
    "hora_inicio" INTEGER NOT NULL DEFAULT 8,
    "hora_fim" INTEGER NOT NULL DEFAULT 20,
    "total_destinatarios" INTEGER NOT NULL DEFAULT 0,
    "criado_por" VARCHAR(255) NOT NULL,
    "iniciada_em" TIMESTAMP(3),
    "concluida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactivation_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reactivation_campaigns_status_criado_em_idx"
    ON "reactivation_campaigns"("status", "criado_em");

-- CreateTable
CREATE TABLE IF NOT EXISTS "reactivation_recipients" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nome" VARCHAR(255),
    "telefone" VARCHAR(24),
    "idioma" VARCHAR(10),
    "estado" VARCHAR(24) NOT NULL,
    "origens" TEXT[],
    "status" VARCHAR(16) NOT NULL DEFAULT 'pendente',
    "motivo" VARCHAR(255),
    "track_token" VARCHAR(32) NOT NULL,
    "claim_em" TIMESTAMP(3),
    "enviado_em" TIMESTAMP(3),
    "clicou_em" TIMESTAMP(3),
    "acessou_em" TIMESTAMP(3),
    "conversation_id" VARCHAR(120),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_erro" VARCHAR(500),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactivation_recipients_pkey" PRIMARY KEY ("id")
);

-- O link do WhatsApp e a chave de leitura de /r/<token>: precisa ser unico.
CREATE UNIQUE INDEX IF NOT EXISTS "reactivation_recipients_track_token_key"
    ON "reactivation_recipients"("track_token");

-- A mesma pessoa nao entra duas vezes na mesma onda.
CREATE UNIQUE INDEX IF NOT EXISTS "reactivation_recipients_campaign_id_user_id_key"
    ON "reactivation_recipients"("campaign_id", "user_id");

CREATE INDEX IF NOT EXISTS "reactivation_recipients_campaign_id_status_idx"
    ON "reactivation_recipients"("campaign_id", "status");

CREATE INDEX IF NOT EXISTS "reactivation_recipients_status_claim_em_idx"
    ON "reactivation_recipients"("status", "claim_em");

-- Apagar a campanha apaga os destinatarios: a lista so existe em funcao dela.
ALTER TABLE "reactivation_recipients"
    DROP CONSTRAINT IF EXISTS "reactivation_recipients_campaign_id_fkey";
ALTER TABLE "reactivation_recipients"
    ADD CONSTRAINT "reactivation_recipients_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "reactivation_campaigns"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
