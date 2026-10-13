-- Conversa apagada pelo proprio usuario. O conteudo (mensagens, memoria do
-- agente no n8n, resumo de encaminhamento) e apagado de verdade; a linha da
-- sessao fica, sem texto, porque a cota diaria do plano gratuito e as metricas de
-- uso contam sessoes. Apagar a linha devolveria a pesquisa a quem apagou.
--
-- Puramente aditiva: uma coluna nula.
ALTER TABLE "ChatSession" ADD COLUMN "deleted_at" TIMESTAMP(3);
