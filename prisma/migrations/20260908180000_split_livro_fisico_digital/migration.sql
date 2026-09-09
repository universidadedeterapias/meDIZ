-- Divide a origem `livro_corpo_diz` em `livro_fisico` e `livro_digital`,
-- quando da para saber qual foi comprado.
--
-- O sinal so existe em purchase_events.external_product_id (o SKU cru da
-- plataforma) — product_entitlements nunca guardou isso, so o produto de
-- catalogo ja resolvido. Depois de resolver, "livro fisico" e "livro digital"
-- viram o MESMO catalog_product_id (permission_key = LIVRO_DIGITAL), porque o
-- que o entitlement representa e o acesso ao conteudo digital, que os dois
-- liberam igual — quem teve frete ou nao e uma pergunta que so o pedido
-- original respondia.
--
-- Medido em producao antes de aplicar: das 1.046 pessoas em `livro_corpo_diz`
-- hoje, so 364 (35%) tem uma linha em purchase_events com SKU reconhecido. As
-- outras 682 vieram so de product_entitlements — a maioria e gente anterior a
-- 17/08/2026, quando purchase_events comecou a existir. Essas continuam em
-- `livro_corpo_diz`, que passa a significar "e o livro, formato nao
-- confirmado" — inventar certeza que nao existe seria pior que admitir o
-- buraco.
--
-- IDs conferidos contra src/lib/purchases/book-purchase.ts (STONE_*) e
-- src/lib/purchases/hotmart-grant-rules.ts (HOTMART_*). Se um dia esses
-- arquivos ganharem produto novo, esta view precisa acompanhar.
--
-- Puramente aditiva: so troca a definicao da view, nenhuma tabela muda.

CREATE OR REPLACE VIEW user_origins AS
WITH bruto AS (
    SELECT lower(pe.email) AS email,
           COALESCE(pe.external_product_name, cp.title, pe.external_product_id) AS produto,
           cp.permission_key::text AS chave,
           pe.provider AS provider,
           pe.external_product_id AS external_product_id,
           'compra · ' || pe.provider AS fonte,
           pe.created_at AS em
      FROM purchase_events pe
      LEFT JOIN catalog_products cp ON cp.id = pe.catalog_product_id
     WHERE pe.status = 'processed' AND pe.email IS NOT NULL
    UNION ALL
    -- product_entitlements nao tem o SKU de origem — so o produto de catalogo
    -- ja resolvido. Por isso provider/external_product_id ficam NULL aqui, e
    -- quem cai so nesta metade nunca sera dividido em fisico/digital.
    SELECT lower(e.email),
           cp.title,
           cp.permission_key::text AS chave,
           NULL,
           NULL,
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
             -- SKU exato primeiro: e o unico jeito de saber fisico vs digital,
             -- e so existe do lado de purchase_events.
             WHEN provider = 'stone' AND external_product_id IN
                  ('a1efe6c8-b98d-4d9e-9e22-4cab1e780424', '1780515697')
                                                        THEN 'livro_fisico'
             WHEN provider = 'stone' AND external_product_id IN
                  ('1780089168', 'a1e5eea6-e1e1-4b0c-9feb-8e98cfba1d51', '1780425821')
                                                        THEN 'livro_digital'
             WHEN provider = 'hotmart' AND external_product_id = '6667092'
                                                        THEN 'livro_fisico'
             WHEN provider = 'hotmart' AND external_product_id IN
                  ('6652189', '6649928', '7377949')     THEN 'livro_digital'
             -- Catalogo depois: e a classificacao que alguem manteve na mao.
             -- Comparado como texto de proposito: permission_key e enum no
             -- Postgres, e citar um rotulo que nao existe derruba a consulta
             -- inteira em vez de simplesmente nao casar.
             WHEN chave = 'PDF' AND lower(produto) LIKE '%sentido%'
                                                        THEN 'guia_sentido_biologico'
             -- Sabe que e o livro (pelo catalogo), mas nao sabe qual formato —
             -- SKU nao bateu em nada acima (entitlement sem purchase_event, ou
             -- produto novo que a lista nao cobre ainda).
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
