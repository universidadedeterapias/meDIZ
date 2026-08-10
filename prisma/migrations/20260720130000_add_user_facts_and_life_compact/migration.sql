-- AlterTable
-- ADD COLUMN ... (sem DEFAULT obrigatorio, todas nullable) e metadata-only no Postgres 11+.
ALTER TABLE "user_profiles" ADD COLUMN     "last_conversation_at" TIMESTAMP(3),
ADD COLUMN     "last_topic" TEXT,
ADD COLUMN     "life_compact" TEXT;

-- CreateTable
CREATE TABLE "user_facts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "approach" TEXT NOT NULL DEFAULT 'ask',
    "sensitivity" TEXT NOT NULL DEFAULT 'normal',
    "confidence" DOUBLE PRECISION,
    "relevance" INTEGER NOT NULL DEFAULT 5,
    "evidence" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_mentioned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "user_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_facts_user_id_type_status_last_mentioned_at_idx" ON "user_facts"("user_id", "type", "status", "last_mentioned_at");

-- AddForeignKey
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
