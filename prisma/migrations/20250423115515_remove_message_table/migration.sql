/*
  Warnings:

  - You are about to drop the column `context` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[threadId]` on the table `ChatSession` will be added. If there are existing duplicate values, this will fail.
  - Made the column `threadId` on table `ChatSession` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "context",
ALTER COLUMN "threadId" SET NOT NULL;

-- DropTable
DROP TABLE "Message";

-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_threadId_key" ON "ChatSession"("threadId");
