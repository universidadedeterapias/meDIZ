-- CreateEnum
CREATE TYPE "StatusVerificacao" AS ENUM ('ENVIADA', 'PROCESSADO', 'ERRO', 'PENDENTE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "mensagem_enviada" TEXT,
ADD COLUMN "status_verificacao" "StatusVerificacao";

-- CreateTable
CREATE TABLE "log_execucoes" (
    "id" TEXT NOT NULL,
    "data_execucao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_clientes_processados" INTEGER NOT NULL DEFAULT 0,
    "total_compras_encontradas" INTEGER NOT NULL DEFAULT 0,
    "total_mensagens_enviadas" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'iniciado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_mensagem_enviada_idx" ON "User"("mensagem_enviada");

-- CreateIndex
CREATE INDEX "User_status_verificacao_idx" ON "User"("status_verificacao");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "log_execucoes_data_execucao_idx" ON "log_execucoes"("data_execucao");