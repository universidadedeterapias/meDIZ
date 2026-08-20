-- Um aviso por venda, garantido pelo banco.
--
-- Hotmart e Stone mandam mais de um webhook para a mesma compra (PURCHASE_APPROVED
-- e PURCHASE_COMPLETE, alem de reentregas), e cada um gerava um aviso novo. Checar
-- em codigo antes de gravar nao resolve: dois webhooks simultaneos passam os dois
-- pela checagem antes de qualquer um gravar. So a unicidade no banco fecha isso.
--
-- Aditiva. As colunas nascem nulas nas linhas que ja existem, e no Postgres NULL
-- nao conflita com NULL — entao o indice sobe sem tocar em nada gravado, e reenvio
-- do atendimento (que nao tem venda) continua podendo repetir a vontade.
ALTER TABLE "access_deliveries" ADD COLUMN "provider" VARCHAR(32);
ALTER TABLE "access_deliveries" ADD COLUMN "external_transaction_id" VARCHAR(120);

CREATE UNIQUE INDEX "access_deliveries_provider_external_transaction_id_key"
    ON "access_deliveries"("provider", "external_transaction_id");
