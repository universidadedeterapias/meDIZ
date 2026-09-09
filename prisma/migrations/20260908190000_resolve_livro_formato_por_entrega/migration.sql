-- Resgata parte do balde `livro_corpo_diz` (formato nao confirmado) usando
-- dois sinais que a migration anterior nao olhava: `book_shipments` (so existe
-- despacho pra quem comprou o fisico — sinal absoluto) e
-- `access_deliveries.payload->>'external_product_id'` (o SKU original, gravado
-- no aviso de acesso desde antes de `purchase_events` existir).
--
-- Medido em producao antes de aplicar: dos 840 em `livro_corpo_diz`, mais 307
-- ganham formato (117 fisico + 190 digital) so com esses dois sinais. Sobram
-- ~533, e para esses o formato e estruturalmente irrecuperavel — nao e falta
-- de query:
--   - ~185 vieram de `library_permissions_api` (o flag legado por tras da
--     migracao de permissoes antigas so perguntava "tem o livro?", nunca
--     "fisico ou digital?" — a distincao nunca existiu nesses registros)
--   - ~124 sao `source = 'manual'` (concessao administrativa avulsa, sem
--     compra nenhuma por tras para consultar)
--   - o resto e hotmart/stone sem nenhum access_delivery nem shipment
--     associado (entitlement criado sem aviso, ex.: script de teste ou
--     backfill sem gerar o registro do aviso)
--
-- CUIDADO na leitura da CASE: a subquery correlacionada e escrita como
-- `WHERE lower(bs.email) = b.email` (nunca so `= email`) de proposito —
-- `book_shipments` e `access_deliveries` TAMBEM tem uma coluna chamada
-- `email`, e um `email` sem qualificar dentro do EXISTS resolve para a tabela
-- mais interna (a de dentro do EXISTS), nao para a linha de fora. Sem o
-- alias `b.` explicito, a comparacao vira `bs.email = bs.email` — sempre
-- verdadeiro — e classificaria todo mundo como fisico. Foi exatamente o que
-- aconteceu na primeira tentativa deste calculo, pego antes de aplicar
-- rodando a troca dentro de uma transacao com ROLLBACK.
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
    -- ja resolvido. Por isso provider/external_product_id ficam NULL aqui.
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
    SELECT b.email,
           COALESCE(b.produto, '(sem nome)') AS produto,
           b.fonte,
           b.em,
           CASE
             -- SKU exato primeiro: e o sinal mais direto, direto da propria
             -- transacao.
             WHEN b.provider = 'stone' AND b.external_product_id IN
                  ('a1efe6c8-b98d-4d9e-9e22-4cab1e780424', '1780515697')
                                                        THEN 'livro_fisico'
             WHEN b.provider = 'stone' AND b.external_product_id IN
                  ('1780089168', 'a1e5eea6-e1e1-4b0c-9feb-8e98cfba1d51', '1780425821')
                                                        THEN 'livro_digital'
             WHEN b.provider = 'hotmart' AND b.external_product_id = '6667092'
                                                        THEN 'livro_fisico'
             WHEN b.provider = 'hotmart' AND b.external_product_id IN
                  ('6652189', '6649928', '7377949')     THEN 'livro_digital'
             WHEN b.chave = 'PDF' AND lower(b.produto) LIKE '%sentido%'
                                                        THEN 'guia_sentido_biologico'
             -- Sabe que e o livro (pelo catalogo), mas o SKU da propria
             -- transacao nao resolveu — tenta os dois sinais de segunda mao
             -- antes de desistir e cair no balde neutro.
             WHEN b.chave = 'LIVRO_DIGITAL' THEN
               CASE
                 -- Despacho so existe para quem comprou o fisico. Sinal
                 -- absoluto, nao precisa de mais nada.
                 WHEN EXISTS (
                   SELECT 1 FROM book_shipments bs WHERE lower(bs.email) = b.email
                 ) THEN 'livro_fisico'
                 -- O SKU original as vezes sobrevive no payload do aviso de
                 -- acesso, mesmo sem purchase_event — access_deliveries existe
                 -- desde antes dessa tabela.
                 WHEN EXISTS (
                   SELECT 1 FROM access_deliveries ad
                    WHERE lower(ad.email) = b.email
                      AND ad.payload->>'external_product_id' IN
                          ('a1efe6c8-b98d-4d9e-9e22-4cab1e780424', '1780515697', '6667092')
                 ) THEN 'livro_fisico'
                 WHEN EXISTS (
                   SELECT 1 FROM access_deliveries ad
                    WHERE lower(ad.email) = b.email
                      AND ad.payload->>'external_product_id' IN
                          ('1780089168', 'a1e5eea6-e1e1-4b0c-9feb-8e98cfba1d51', '1780425821',
                           '6652189', '6649928', '7377949')
                 ) THEN 'livro_digital'
                 ELSE 'livro_corpo_diz'
               END
             WHEN b.chave = 'AUDIOTERAPIA'                THEN 'audioterapia'
             WHEN b.chave = 'VIDEO'                       THEN 'curso'
             -- PDF que nao e o Guia aparece como `outro` de proposito: produto
             -- novo tem que ficar visivel, nao ser absorvido pela tag errada.
             WHEN b.chave = 'PDF'                         THEN 'outro'
             -- Sem produto no catalogo: sobra o nome que a plataforma mandou.
             WHEN lower(b.produto) LIKE '%corpo diz%'
               OR lower(b.produto) LIKE '%cuerpo habla%'  THEN 'livro_corpo_diz'
             WHEN lower(b.produto) LIKE '%sentido biol%'  THEN 'guia_sentido_biologico'
             WHEN lower(b.produto) LIKE '%audioterapia%'
               OR lower(b.produto) LIKE '%liberando%'     THEN 'audioterapia'
             WHEN lower(b.produto) LIKE '%mediz%'
               OR lower(b.produto) LIKE '%medíz%'         THEN 'assinatura'
             WHEN lower(b.produto) LIKE '%sess_o pronta%'
               OR lower(b.produto) LIKE '%curso%'         THEN 'curso'
             ELSE 'outro'
           END AS origem
      FROM bruto b
)
SELECT DISTINCT ON (u.id, c.origem, c.produto)
       u.id AS user_id, c.origem, c.produto, c.fonte, c.em
  FROM classificado c
  JOIN "User" u ON lower(u.email) = c.email
 ORDER BY u.id, c.origem, c.produto, c.em DESC;
