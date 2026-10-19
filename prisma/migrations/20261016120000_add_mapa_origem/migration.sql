-- Mapa da Origem Emocional (Epic 7, Story 7.1).
--
-- mapas_origem: o Mapa gerado na pagina publica /mapa, anonimo ate o pagamento.
-- mapa_creditos: pagamento que nao achou o Mapa vira credito de resgate.
--
-- Puramente aditiva: duas tabelas novas, seus indices e FKs para "User".
-- Nenhuma tabela existente e alterada.

-- CreateTable
CREATE TABLE "mapas_origem" (
    "id" TEXT NOT NULL,
    "public_token" VARCHAR(32) NOT NULL,
    "telefone" VARCHAR(20),
    "nome" VARCHAR(80) NOT NULL,
    "sintoma" VARCHAR(500) NOT NULL,
    "tempo" VARCHAR(120),
    "momentos" JSONB,
    "familia" VARCHAR(500),
    "para_outra_pessoa" BOOLEAN NOT NULL DEFAULT false,
    "relacao" VARCHAR(60),
    "status" VARCHAR(16) NOT NULL DEFAULT 'gerando',
    "tentativas_geracao" INTEGER NOT NULL DEFAULT 0,
    "geracao_iniciada_em" TIMESTAMP(3),
    "geracao_concluida_em" TIMESTAMP(3),
    "erro_geracao" VARCHAR(500),
    "conteudo" JSONB,
    "schema_version" INTEGER,
    "frase_forte" VARCHAR(300),
    "user_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "provider" VARCHAR(32),
    "transaction_id" VARCHAR(120),
    "vinculo" VARCHAR(16),
    "entrega_status" VARCHAR(16),
    "entrega_erro" VARCHAR(500),
    "entregue_em" TIMESTAMP(3),
    "dispositivo_hash" VARCHAR(64),
    "ip_hash" VARCHAR(64),
    "utm" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapas_origem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapa_creditos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "transaction_id" VARCHAR(120) NOT NULL,
    "purchase_event_id" TEXT,
    "mapa_id" TEXT,
    "usado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapa_creditos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mapas_origem_public_token_key" ON "mapas_origem"("public_token");

-- CreateIndex
CREATE INDEX "mapas_origem_telefone_created_at_idx" ON "mapas_origem"("telefone", "created_at");

-- CreateIndex
CREATE INDEX "mapas_origem_ip_hash_created_at_idx" ON "mapas_origem"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "mapas_origem_dispositivo_hash_created_at_idx" ON "mapas_origem"("dispositivo_hash", "created_at");

-- CreateIndex
CREATE INDEX "mapas_origem_user_id_idx" ON "mapas_origem"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapas_origem_provider_transaction_id_key" ON "mapas_origem"("provider", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapa_creditos_mapa_id_key" ON "mapa_creditos"("mapa_id");

-- CreateIndex
CREATE INDEX "mapa_creditos_user_id_usado_em_idx" ON "mapa_creditos"("user_id", "usado_em");

-- CreateIndex
CREATE UNIQUE INDEX "mapa_creditos_provider_transaction_id_key" ON "mapa_creditos"("provider", "transaction_id");

-- AddForeignKey
ALTER TABLE "mapas_origem" ADD CONSTRAINT "mapas_origem_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapa_creditos" ADD CONSTRAINT "mapa_creditos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

