-- Registro de auditoria de um lote de importacao de planilha: quantas linhas,
-- quantas viraram conta nova, quantas casaram com conta existente, quantas
-- ficaram ambiguas. Nao guarda a planilha em si, so o resultado.
--
-- Puramente aditiva: tabela nova, nenhuma alteracao em tabela existente. Sem
-- FK obrigatoria para catalog_products/tags — mesmo padrao de tabela de
-- auditoria ja usado no projeto.

CREATE TABLE IF NOT EXISTS "importacoes_planilha" (
    "id" TEXT NOT NULL,
    "nome_arquivo" VARCHAR(255) NOT NULL,
    "catalog_product_id" TEXT NOT NULL,
    "concede_acesso" BOOLEAN NOT NULL DEFAULT false,
    "tag_id" TEXT,
    "total_linhas" INTEGER NOT NULL DEFAULT 0,
    "total_criados" INTEGER NOT NULL DEFAULT 0,
    "total_casados" INTEGER NOT NULL DEFAULT 0,
    "total_ambiguos" INTEGER NOT NULL DEFAULT 0,
    "total_ignorados" INTEGER NOT NULL DEFAULT 0,
    "criado_por" VARCHAR(255) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "importacoes_planilha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "importacoes_planilha_criado_em_idx" ON "importacoes_planilha"("criado_em");
