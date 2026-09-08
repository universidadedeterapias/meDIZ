-- Mapeamento das variaveis e do botao do template, por onda.
--
-- Sem isto o nome do template e configuravel no painel mas o CONTEUDO nao: as
-- variaveis ficavam fixas no no de codigo do n8n, e template com uma variavel a
-- mais exigia editar o fluxo. Configurar a onda no painel e depois abrir o n8n
-- para completar e ter a configuracao em dois lugares — que e o mesmo que nao
-- ter em nenhum.
--
-- Quem resolve as variaveis e o /claim, no app: ele conhece o destinatario e ja
-- devolve `var_1`, `var_2` prontos. O n8n vira cano burro e serve qualquer
-- template sem alteracao.
--
-- Colunas anulaveis: onda antiga sem mapeamento continua funcionando com o
-- padrao (var_1 = primeiro nome, botao com o token).
--
-- Puramente aditiva.

ALTER TABLE "reactivation_campaigns"
    ADD COLUMN IF NOT EXISTS "variaveis" JSONB;

ALTER TABLE "reactivation_campaigns"
    ADD COLUMN IF NOT EXISTS "botao" JSONB;
