ALTER TABLE "ChatSession"
ADD COLUMN "routing_status" VARCHAR(32),
ADD COLUMN "routing_destination" VARCHAR(32),
ADD COLUMN "routing_intent_summary" TEXT,
ADD COLUMN "routing_question_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "chat_handoffs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "source_session_id" TEXT NOT NULL,
  "destination" VARCHAR(32) NOT NULL,
  "context_summary" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "target_thread_id" VARCHAR(64),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_handoffs_user_id_created_at_idx"
ON "chat_handoffs"("user_id", "created_at");

CREATE INDEX "chat_handoffs_source_session_id_idx"
ON "chat_handoffs"("source_session_id");

CREATE INDEX "chat_handoffs_expires_at_consumed_at_idx"
ON "chat_handoffs"("expires_at", "consumed_at");

ALTER TABLE "chat_handoffs"
ADD CONSTRAINT "chat_handoffs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_handoffs"
ADD CONSTRAINT "chat_handoffs_source_session_id_fkey"
FOREIGN KEY ("source_session_id") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
