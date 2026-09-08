-- Amostragem da onda: hoje criar uma onda materializa 1:1 tudo que bate no
-- recorte. Sem jeito de dizer "300 pessoas" ou "20% da base" — so o recorte
-- inteiro ou nada.
--
-- amostragem_modo/valor guardam a escolha; total_recorte guarda quantos
-- bateram no filtro ANTES do sorteio, para a lista de ondas poder mostrar
-- "300 de 1.842 (16%)" em vez de so o numero final.
--
-- Puramente aditiva. Onda antiga fica com modo = 'todos' e total_recorte =
-- total_destinatarios, que e exatamente o que ela sempre foi.

ALTER TABLE "reactivation_campaigns"
    ADD COLUMN IF NOT EXISTS "amostragem_modo" VARCHAR(16) NOT NULL DEFAULT 'todos';

ALTER TABLE "reactivation_campaigns"
    ADD COLUMN IF NOT EXISTS "amostragem_valor" INTEGER;

ALTER TABLE "reactivation_campaigns"
    ADD COLUMN IF NOT EXISTS "total_recorte" INTEGER NOT NULL DEFAULT 0;

UPDATE "reactivation_campaigns"
   SET "total_recorte" = "total_destinatarios"
 WHERE "total_recorte" = 0;
