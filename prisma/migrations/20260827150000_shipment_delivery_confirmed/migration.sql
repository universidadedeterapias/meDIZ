-- Confirmacao de recebimento feita pelo proprio comprador.
--
-- Aditiva: coluna nova e nullable numa tabela que ja existe. Nenhuma linha
-- muda, nenhuma leitura antiga quebra.
--
-- Existe separada de `delivered_at` de proposito. As duas dizem "chegou", mas
-- por bocas diferentes: `delivered_at` e o que a transportadora informou, e
-- esta e o que o cliente confirmou na tela. Guardar as duas permite saber
-- quando a transportadora disse que entregou e ninguem confirmou — que e
-- justamente o caso que o atendimento precisa olhar.
ALTER TABLE "book_shipments"
  ADD COLUMN IF NOT EXISTS "delivery_confirmed_at" TIMESTAMP(3);
