-- Migration: Add hotmartId to Plan table
-- Execute this SQL directly in your database

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "hotmartId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_hotmartId_key" ON "Plan"("hotmartId") WHERE "hotmartId" IS NOT NULL;

