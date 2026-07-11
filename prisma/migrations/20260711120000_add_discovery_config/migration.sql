-- Painel de teste do discovery em HML: prompt ativo do agente, editavel via UI (DISCOVERY_TEST_MODE=true).
CREATE TABLE "discovery_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "system_prompt" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_config_pkey" PRIMARY KEY ("id")
);
