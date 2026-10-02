-- Admin pode zerar a cota diaria de pesquisas do plano gratuito sem apagar nem
-- redatar conversas: a contagem passa a comecar no mais recente entre a
-- meia-noite e este instante.
ALTER TABLE "User" ADD COLUMN "search_quota_reset_at" TIMESTAMP(3);
