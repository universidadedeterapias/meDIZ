-- CreateTable
CREATE TABLE "pending_hotmart_purchases" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "transaction" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_hotmart_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_hotmart_purchases_stripeSubscriptionId_key" ON "pending_hotmart_purchases"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "pending_hotmart_purchases_email_status_idx" ON "pending_hotmart_purchases"("email", "status");

-- CreateIndex
CREATE INDEX "pending_hotmart_purchases_stripeSubscriptionId_idx" ON "pending_hotmart_purchases"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "pending_hotmart_purchases" ADD CONSTRAINT "pending_hotmart_purchases_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
