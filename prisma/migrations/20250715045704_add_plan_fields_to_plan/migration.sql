-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "interval" "PlanInterval",
ADD COLUMN     "intervalCount" INTEGER,
ADD COLUMN     "stripeProductId" TEXT,
ADD COLUMN     "trialPeriodDays" INTEGER;
