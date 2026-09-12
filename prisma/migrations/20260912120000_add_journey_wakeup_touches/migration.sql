-- Log de cada toque enviado pelas reguas de 48h ("Os Dois Despertadores"),
-- com o conversationId do Chatvolt devolvido no envio.
--
-- Existe pra fechar o "quem respondeu?" sem depender de telefone: casar por
-- numero exige normalizar dos dois lados (User.whatsapp e gravado cru na
-- maioria dos cadastros) e ainda assim pode falhar. conversationId nao tem
-- esse problema — e o id exato que o Chatvolt usa, e o mesmo que o webhook de
-- mensagem recebida devolve.
--
-- O contador de quantos toques ja foram mandados por regua continua no
-- Chatvolt, como tag (decisao do Edgar, 12/09/2026). Esta tabela nao substitui
-- aquilo — e so o log de auditoria do envio e o alvo do UPDATE quando chega
-- uma resposta.
--
-- Aditiva: tabela nova, nao toca em nada existente.
CREATE TABLE "journey_wakeup_touches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sistema" VARCHAR(16) NOT NULL,
    "toque" INTEGER NOT NULL,
    "conversation_id" VARCHAR(64) NOT NULL,
    "template" VARCHAR(40),
    "status" VARCHAR(16) NOT NULL DEFAULT 'enviado',
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondido_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_wakeup_touches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "journey_wakeup_touches_sistema_check"
      CHECK ("sistema" IN ('acesso', 'pesquisa')),
    CONSTRAINT "journey_wakeup_touches_toque_check"
      CHECK ("toque" BETWEEN 1 AND 4),
    CONSTRAINT "journey_wakeup_touches_status_check"
      CHECK ("status" IN ('enviado', 'respondido')),

    -- Cascata: apagar a conta apaga o log dela, mesmo criterio de journey_events.
    CONSTRAINT "journey_wakeup_touches_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Uma linha por pessoa por toque da regua: reenviar o mesmo toque (retry do
-- job, corrida entre duas execucoes) atualiza a linha, nao duplica.
CREATE UNIQUE INDEX "journey_wakeup_touches_user_id_sistema_toque_key"
  ON "journey_wakeup_touches"("user_id", "sistema", "toque");

-- E por aqui que o webhook de resposta encontra a conversa. Indice normal, nao
-- unique: os ate quatro toques da mesma pessoa compartilham o mesmo
-- conversationId.
CREATE INDEX "journey_wakeup_touches_conversation_id_idx"
  ON "journey_wakeup_touches"("conversation_id");
