-- Marca quando a pessoa passou pelo tutorial do meDIZ 2.0 (concluiu ou pulou).
--
-- Nulo == ainda nao passou, entao a base inteira cai no gate no proximo acesso,
-- que e exatamente o comportamento desejado no lancamento do 2.0. Quem ainda nao
-- tem linha em "user_profiles" tambem cai no gate: a ausencia do perfil e lida
-- como "nao viu", e a linha e criada por upsert quando o tutorial termina.
--
-- Aditivo e nullable: pode ser aplicado com a versao antiga do app no ar.

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "tutorial_seen_at" TIMESTAMP(3);
