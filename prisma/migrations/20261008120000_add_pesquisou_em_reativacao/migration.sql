-- Primeira pesquisa no app depois de uma onda de reativacao. O app grava quando
-- o n8n confirmou o aviso, que move a conversa para a etapa "pesquisou" do
-- cenario da onda no Chatvolt. Tambem vira metrica: quem pesquisou apos a onda.
--
-- Puramente aditiva: uma coluna nula e um indice.
ALTER TABLE "reactivation_recipients" ADD COLUMN "pesquisou_em" TIMESTAMP(3);

-- A busca acontece a cada pesquisa no app: "ultima onda desta pessoa".
CREATE INDEX "reactivation_recipients_user_id_enviado_em_idx" ON "reactivation_recipients"("user_id", "enviado_em");
