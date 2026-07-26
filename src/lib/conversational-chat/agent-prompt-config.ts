import { prisma } from '@/lib/prisma'
import type { ConversationalAgentId } from '@/lib/conversational-chat/config'

export async function getAgentPromptOverride(
  agent: ConversationalAgentId
): Promise<string | null> {
  const config = await prisma.agentPromptConfig.findUnique({
    where: { agent },
    select: { systemPrompt: true }
  })

  return config?.systemPrompt ?? null
}

export async function setAgentPromptOverride(
  agent: ConversationalAgentId,
  systemPrompt: string,
  updatedBy: string
) {
  await prisma.agentPromptConfig.upsert({
    where: { agent },
    create: { agent, systemPrompt, updatedBy },
    update: { systemPrompt, updatedBy }
  })
}

export async function resetAgentPromptOverride(agent: ConversationalAgentId) {
  await prisma.agentPromptConfig.deleteMany({ where: { agent } })
}
