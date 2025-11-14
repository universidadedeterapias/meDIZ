-- Migration: add-chat-cache-expiration
-- This migration documents the addition of ChatMessage and ChatAnswerCache models
-- with expiresAt field for cache TTL management.
-- 
-- Note: These changes were already applied via `prisma db push` during development.
-- This migration file exists to maintain migration history consistency.

-- ChatMessage and ChatAnswerCache tables are already created in the database.
-- The expiresAt field on ChatAnswerCache enables automatic cache expiration.

