-- Uma mensagem por pessoa, e nao uma por venda.
--
-- O indice de `(provider, external_transaction_id)` ja impedia dois avisos para a
-- MESMA venda. O que ele nao cobre e a mesma pessoa comprando duas vezes: livro
-- impresso e digital no mesmo checkout, dois exemplares em pedidos separados,
-- audioterapia comprada depois. Cada uma dessas e uma venda diferente, com
-- transacao diferente, e cada uma virava mensagem.
--
-- Checar em codigo antes de gravar nao fecha a corrida: dois webhooks que chegam
-- juntos passam os dois pela checagem antes de qualquer um gravar. A trava tem de
-- ser do banco, e por isso e uma coluna do proprio usuario — `UPDATE ... WHERE
-- access_message_at IS NULL` so acerta linha uma vez, e quem acertar manda.
--
-- Aditiva: coluna nova e nullable. Nenhuma leitura antiga quebra.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "access_message_at" TIMESTAMP(3);

-- Backfill obrigatorio: sem ele, todo mundo que ja recebeu o aviso apareceria
-- como "nunca recebeu" e ganharia um segundo na proxima compra — exatamente o
-- que esta migration existe para impedir.
--
-- So conta aviso que saiu (`sent`): o que ficou `pending`/`failed` ainda vai ser
-- reprocessado, e marcar a pessoa agora deixaria a fila de reenvio sem efeito.
-- Reenvio do atendimento (`kind = 'access_resent'`) fica de fora porque nao e o
-- aviso da compra — quem so pediu segunda via continua elegivel ao seu primeiro.
UPDATE "User" u
SET "access_message_at" = d."primeiro"
FROM (
  SELECT "user_id", MIN(COALESCE("sent_at", "created_at")) AS "primeiro"
  FROM "access_deliveries"
  WHERE "user_id" IS NOT NULL
    AND "status" = 'sent'
    AND "kind" <> 'access_resent'
  GROUP BY "user_id"
) d
WHERE u."id" = d."user_id"
  AND u."access_message_at" IS NULL;

