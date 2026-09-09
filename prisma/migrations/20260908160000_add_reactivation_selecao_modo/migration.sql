-- Como a onda foi selecionada: por filtro (estado/origem/tag/data) ou por
-- lista manual de pessoas marcadas na tela por checkbox.
--
-- Puramente aditiva. Onda existente cai no default 'filtro', que e exatamente
-- o que ela sempre foi ate aqui.

ALTER TABLE "reactivation_campaigns"
    ADD COLUMN IF NOT EXISTS "selecao_modo" VARCHAR(16) NOT NULL DEFAULT 'filtro';
