-- Painel de teste de prompt dos agentes conversacionais no /chat (AGENT_PROMPT_TEST_MODE=true).
-- Uma linha por agente; o n8n passa a consultar esta tabela antes de usar o prompt hardcoded no workflow.
CREATE TABLE "agent_prompt_config" (
    "agent" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_prompt_config_pkey" PRIMARY KEY ("agent")
);
