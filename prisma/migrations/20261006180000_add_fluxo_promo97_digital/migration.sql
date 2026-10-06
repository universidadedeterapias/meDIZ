-- Fluxo novo no portao de envio: PROMO 97 | DIGITAL. Quem compra a oferta do
-- livro digital a preco simbolico no Guru recebe, por um numero da Z-API, a
-- oferta do livro impresso, e a conversa segue na etapa PROMO 97 do Chatvolt.
--
-- conta_no_limite_pessoa = false: sai por outro numero (Z-API), entao nao
-- disputa o limite de 24h com os templates da API oficial.
--
-- Puramente aditiva: so insere uma linha em fluxos_automacao.
INSERT INTO "fluxos_automacao"
    ("fluxo", "nome", "ligado", "teto_diario", "conta_no_limite_pessoa", "limite_pessoa_24h", "observacao", "atualizado_por", "atualizado_em")
VALUES
    ('promo97_digital', 'PROMO 97 | DIGITAL — up sell do impresso', true, 200, false, 3, 'Z-API; 1 mensagem por compra', 'migration', CURRENT_TIMESTAMP)
ON CONFLICT ("fluxo") DO NOTHING;
