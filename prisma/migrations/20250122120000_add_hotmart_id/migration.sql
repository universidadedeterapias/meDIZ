-- AlterTable
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "hotmartId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_hotmartId_key" ON "Plan"("hotmartId") WHERE "hotmartId" IS NOT NULL;

