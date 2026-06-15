-- CreateEnum
CREATE TYPE "ChatKind" AS ENUM ('SEARCH', 'SIMULADOR', 'PROF');

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "chat_kind" "ChatKind" NOT NULL DEFAULT 'SEARCH';

-- CreateIndex
CREATE INDEX "ChatSession_userId_chat_kind_createdAt_idx" ON "ChatSession"("userId", "chat_kind", "createdAt");
