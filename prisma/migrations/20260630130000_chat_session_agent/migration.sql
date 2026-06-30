-- Additive and nullable to keep every existing chat session valid.
ALTER TABLE "ChatSession" ADD COLUMN "agent" VARCHAR(16);
