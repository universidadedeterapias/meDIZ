-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatSession_userId_startedAt_idx" ON "ChatSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatSession_userId_isFavorite_idx" ON "ChatSession"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reminder_active_time_idx" ON "Reminder"("active", "time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatAnswerCache_expiresAt_idx" ON "ChatAnswerCache"("expiresAt");
