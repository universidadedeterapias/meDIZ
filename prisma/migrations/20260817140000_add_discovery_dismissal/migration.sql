-- Estado de "adiado" para a descoberta.
--
-- Ate agora `discovery_completed` acumulava dois significados: "fez a descoberta"
-- e "recusou o consentimento" — a recusa gravava `discovery_completed = true`.
-- Isso criava os dois extremos ao mesmo tempo: quem recusava nunca mais recebia o
-- convite, e quem aceitava mas nao conseguia concluir ficava preso no gate, porque
-- a tela de consentimento (a unica com botao de saida) deixava de aparecer.
--
-- Puramente aditiva: duas colunas novas com default, sem alterar dados. Pode ser
-- aplicada com a versao antiga do app no ar, que simplesmente as ignora.
--
-- ATENCAO: a reclassificacao de quem recusou no passado NAO esta aqui de proposito.
-- Ela zera `discovery_completed` dessas linhas e, com o codigo antigo ainda no ar,
-- jogaria essas pessoas de volta no redirect. Rode `npm run backfill:discovery-dismissal`
-- DEPOIS do deploy.

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "discovery_dismissed_at" TIMESTAMP(3);

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "discovery_dismiss_count" INTEGER NOT NULL DEFAULT 0;
