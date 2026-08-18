-- Marca a primeira entrada da pessoa no app depois da compra.
--
-- O convite da descoberta passa a aparecer so a partir da SEGUNDA visita: quem
-- acabou de comprar um livro le o livro primeiro. A partir dai o convite volta,
-- ate a terceira aparicao, quando deixa de ser opcional.
--
-- Puramente aditiva: coluna nova e anulavel. Pode ser aplicada com a versao
-- antiga do app no ar, que simplesmente a ignora.

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "first_access_at" TIMESTAMP(3);
