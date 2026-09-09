-- Tag livre, nao presa a reativacao. Importacao carimba uma por lote, onda
-- carimba "Enviado: <nome>" quando o envio e confirmado, e o admin carimba a
-- mao para qualquer grupo de pessoas.
--
-- Puramente aditiva: duas tabelas novas, nenhuma alteracao em tabela existente.

CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "cor" VARCHAR(16),
    "criado_por" VARCHAR(255) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tags_nome_key" ON "tags"("nome");

CREATE TABLE IF NOT EXISTS "user_tags" (
    "id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "origem" VARCHAR(16) NOT NULL,
    "campanha_id" TEXT,
    "criado_por" VARCHAR(255),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_tags_tag_id_user_id_key" ON "user_tags"("tag_id", "user_id");
CREATE INDEX IF NOT EXISTS "user_tags_user_id_idx" ON "user_tags"("user_id");
CREATE INDEX IF NOT EXISTS "user_tags_tag_id_idx" ON "user_tags"("tag_id");

ALTER TABLE "user_tags"
    DROP CONSTRAINT IF EXISTS "user_tags_tag_id_fkey";
ALTER TABLE "user_tags"
    ADD CONSTRAINT "user_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "tags"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
