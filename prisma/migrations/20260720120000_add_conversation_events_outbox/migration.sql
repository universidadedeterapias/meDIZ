-- AlterTable
-- ADD COLUMN ... DEFAULT is a metadata-only operation on Postgres 11+, no table rewrite.
ALTER TABLE "ChatSession" ADD COLUMN     "message_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_checkpoint_message_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "conversation_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT 'conversation.checkpoint.v1',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "trigger" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_events_user_id_idx" ON "conversation_events"("user_id");

-- CreateIndex
CREATE INDEX "conversation_events_session_id_idx" ON "conversation_events"("session_id");

-- CreateIndex
CREATE INDEX "conversation_events_available_at_status_idx" ON "conversation_events"("available_at", "status");

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
