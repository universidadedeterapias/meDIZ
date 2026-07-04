-- CreateTable
CREATE TABLE "user_discovery_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descobertaOk" BOOLEAN NOT NULL DEFAULT false,
    "consentimentoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_discovery_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_discovery_profiles_userId_key" ON "user_discovery_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_discovery_profiles_descobertaOk_idx" ON "user_discovery_profiles"("descobertaOk");

-- AddForeignKey
ALTER TABLE "user_discovery_profiles" ADD CONSTRAINT "user_discovery_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
