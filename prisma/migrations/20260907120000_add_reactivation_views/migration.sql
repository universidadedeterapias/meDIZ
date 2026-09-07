-- Views que respondem "quem esta acordado e quem sumiu", sem gravar nada.
--
-- A classificacao de reativacao (ativo / dormente / explorador / frio) precisa de
-- duas coisas: se a pessoa assina e quando ela apareceu pela ultima vez. A
-- primeira existe. A segunda nao — nao ha registro de ultimo acesso em lugar
-- nenhum do schema, e a sessao e JWT, entao nem a tabela Session enche.
--
-- O que existe sao rastros de uso espalhados. Unidos, cobrem 2.230 dos 3.310
-- usuarios; dos 1.080 restantes, 1.008 nunca acessaram de fato (first_access_at
-- nulo ou sem perfil). O ponto cego real e de 72 pessoas — 2,2%.
--
-- Isto e retroativo, e nao substituto: mede USO, nao acesso. Quem abre o app,
-- olha e sai sem pesquisar nem baixar nao gera linha nenhuma — e essa e
-- exatamente a populacao que uma campanha de reativacao produz. Um `last_seen_at`
-- gravado de verdade continua sendo necessario para medir a propria campanha.
--
-- View e nao coluna de proposito: o estado tem que ser recalculado, nunca
-- digitado, e o corte de 30 dias precisa ser parametro de quem consulta.
--
-- Puramente aditiva: cria duas views e nao altera nenhuma tabela.

-- Ultimo rastro de uso por usuario, com a fonte que o produziu.
--
-- A fonte importa para o admin entender a classificacao: "frio ha 94 dias" e uma
-- afirmacao fraca se ninguem souber que o unico sinal que existe e conversa.
--
-- push_subscriptions ficou de fora de proposito: o navegador rotaciona a
-- inscricao sozinho, sem a pessoa tocar em nada, e isso marcaria atividade falsa.
CREATE OR REPLACE VIEW user_last_seen AS
WITH sinais AS (
    SELECT "userId"::text AS user_id, 'conversa'::text AS fonte,
           max("createdAt") AS visto_em
      FROM "ChatSession" GROUP BY 1
    UNION ALL
    SELECT user_id::text, 'download_biblioteca', max(created_at)
      FROM pdf_downloads GROUP BY 1
    UNION ALL
    SELECT user_id::text, 'descoberta', max(created_at)
      FROM discovery_events GROUP BY 1
    UNION ALL
    SELECT user_id::text, 'checkpoint_conversa', max(available_at)
      FROM conversation_events GROUP BY 1
    UNION ALL
    SELECT "userId"::text, 'pasta_sintoma', max("createdAt")
      FROM "SymptomFolder" GROUP BY 1
    UNION ALL
    SELECT user_id::text, 'evento_jornada', max(created_at)
      FROM journey_events GROUP BY 1
    UNION ALL
    SELECT "userId"::text, 'lembrete', max("createdAt")
      FROM reminders GROUP BY 1
)
SELECT DISTINCT ON (user_id)
       user_id,
       visto_em AS ultimo_sinal_em,
       fonte    AS ultima_fonte
  FROM sinais
 WHERE visto_em IS NOT NULL
 ORDER BY user_id, visto_em DESC;

-- Fatos por usuario. Nao classifica: entrega o material da classificacao para
-- quem consulta aplicar o corte que quiser.
--
-- A assinatura vem por DISTINCT ON com precedencia active > trialing > resto:
-- quem teve trial e converteu conta como assinante, nao como trial.
CREATE OR REPLACE VIEW user_reactivation_facts AS
WITH assinatura AS (
    SELECT DISTINCT ON ("userId")
           "userId"::text AS user_id,
           lower(status)  AS status,
           "createdAt"    AS desde,
           "currentPeriodEnd" AS vence_em
      FROM "Subscription"
     ORDER BY "userId",
              (CASE lower(status) WHEN 'active' THEN 0 WHEN 'trialing' THEN 1 ELSE 2 END),
              "createdAt" DESC
),
perfil AS (
    SELECT DISTINCT ON (user_id) user_id::text AS user_id, first_access_at
      FROM user_profiles ORDER BY user_id, first_access_at NULLS LAST
)
SELECT u.id                       AS user_id,
       u.email,
       u.name                     AS nome,
       u.whatsapp,
       u."preferredLanguage"      AS idioma,
       u."createdAt"              AS conta_criada_em,
       a.status                   AS assinatura_status,
       a.desde                    AS assinatura_desde,
       a.vence_em                 AS assinatura_vence_em,
       p.first_access_at,
       ls.ultimo_sinal_em,
       ls.ultima_fonte,
       CASE WHEN ls.ultimo_sinal_em IS NULL THEN NULL
            ELSE floor(EXTRACT(EPOCH FROM (now() - ls.ultimo_sinal_em)) / 86400)::int
       END                        AS dias_sem_sinal
  FROM "User" u
  LEFT JOIN assinatura a ON a.user_id = u.id
  LEFT JOIN perfil     p ON p.user_id = u.id
  LEFT JOIN user_last_seen ls ON ls.user_id = u.id;

-- Origem de cada pessoa, com a evidencia que sustenta a tag.
--
-- A classificacao mora aqui, em SQL, e nao no TypeScript: o filtro de incluir e
-- excluir por origem e a funcao que o plano chama de mais importante, e ele
-- precisa acontecer antes da paginacao — senao a contagem de "quantas pessoas
-- bateram no filtro" mente, que e o unico numero que impede disparo acidental em
-- volume. Regra escrita duas vezes e regra que diverge; entao existe uma so.
--
-- Quem classifica e `catalog_products.permission_key`, e nao o nome do produto.
-- O nome varia com a plataforma e com o idioma — o mesmo livro e "O CORPO DIZ —
-- LIVRO FÍSICO" na Hotmart, "O CORPO DIZ - LIVRO FÍSICO" no Guru e "EL CUERPO
-- HABLA" em espanhol — enquanto a permission_key ja e vocabulario curado por
-- quem cadastra produto. Casar texto classificava 1.204 pessoas do Guia como
-- "outro" so porque o produto se chama "SENTIDO BIOLÓGICO" e nao "Guia Sentido
-- Biológico".
--
-- O nome so entra como ultimo recurso, para compra que nao casou com nenhum
-- produto do catalogo. Produto novo que ninguem previu cai em `outro` e aparece
-- no painel com o nome cru — que e o suficiente para alguem vir aqui e
-- acrescentar a regra, em vez de sumir em silencio.
--
-- Duas fontes que se completam: product_entitlements cobre mais gente porque
-- nasceu antes; purchase_events so existe desde 17/08/2026, mas carrega provider
-- e data da compra.
--
-- `aluno` e `ex_aluno` estao no plano e nao aparecem aqui: a formacao vive em
-- outra plataforma e nunca foi importada. Vao aparecer zeradas no painel ate
-- existir importacao — o que e a informacao certa, e nao um buraco silencioso.
CREATE OR REPLACE VIEW user_origins AS
WITH bruto AS (
    SELECT lower(pe.email) AS email,
           COALESCE(pe.external_product_name, cp.title, pe.external_product_id) AS produto,
           cp.permission_key::text AS chave,
           'compra · ' || pe.provider AS fonte,
           pe.created_at AS em
      FROM purchase_events pe
      LEFT JOIN catalog_products cp ON cp.id = pe.catalog_product_id
     WHERE pe.status = 'processed' AND pe.email IS NOT NULL
    UNION ALL
    SELECT lower(e.email),
           cp.title,
           cp.permission_key::text AS chave,
           'liberação · ' || COALESCE(e.source, 'origem não registrada'),
           e.created_at
      FROM product_entitlements e
      LEFT JOIN catalog_products cp ON cp.id = e.catalog_product_id
     WHERE e.email IS NOT NULL
),
classificado AS (
    SELECT email,
           COALESCE(produto, '(sem nome)') AS produto,
           fonte,
           em,
           CASE
             -- Catalogo primeiro: e a classificacao que alguem manteve na mao.
             -- Comparado como texto de proposito: permission_key e enum no
             -- Postgres, e citar um rotulo que nao existe derruba a consulta
             -- inteira em vez de simplesmente nao casar.
             WHEN chave = 'PDF' AND lower(produto) LIKE '%sentido%'
                                                        THEN 'guia_sentido_biologico'
             WHEN chave = 'LIVRO_DIGITAL'               THEN 'livro_corpo_diz'
             WHEN chave = 'AUDIOTERAPIA'                THEN 'audioterapia'
             WHEN chave = 'VIDEO'                       THEN 'curso'
             -- PDF que nao e o Guia aparece como `outro` de proposito: produto
             -- novo tem que ficar visivel, nao ser absorvido pela tag errada.
             WHEN chave = 'PDF'                         THEN 'outro'
             -- Sem produto no catalogo: sobra o nome que a plataforma mandou.
             WHEN lower(produto) LIKE '%corpo diz%'
               OR lower(produto) LIKE '%cuerpo habla%'  THEN 'livro_corpo_diz'
             WHEN lower(produto) LIKE '%sentido biol%'  THEN 'guia_sentido_biologico'
             WHEN lower(produto) LIKE '%audioterapia%'
               OR lower(produto) LIKE '%liberando%'     THEN 'audioterapia'
             WHEN lower(produto) LIKE '%mediz%'
               OR lower(produto) LIKE '%medíz%'         THEN 'assinatura'
             WHEN lower(produto) LIKE '%sess_o pronta%'
               OR lower(produto) LIKE '%curso%'         THEN 'curso'
             ELSE 'outro'
           END AS origem
      FROM bruto
)
SELECT DISTINCT ON (u.id, c.origem, c.produto)
       u.id AS user_id, c.origem, c.produto, c.fonte, c.em
  FROM classificado c
  JOIN "User" u ON lower(u.email) = c.email
 ORDER BY u.id, c.origem, c.produto, c.em DESC;
