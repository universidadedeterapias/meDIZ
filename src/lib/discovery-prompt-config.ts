import { DISCOVERY_SYSTEM_PROMPT } from '@/lib/discovery'
import { prisma } from '@/lib/prisma'

const DISCOVERY_CONFIG_ID = 'singleton'

export async function getActiveDiscoverySystemPrompt(): Promise<string> {
  const config = await prisma.discoveryConfig.findUnique({
    where: { id: DISCOVERY_CONFIG_ID },
    select: { systemPrompt: true }
  })

  return config?.systemPrompt || DISCOVERY_SYSTEM_PROMPT
}

export async function setDiscoverySystemPromptOverride(systemPrompt: string, updatedBy: string) {
  await prisma.discoveryConfig.upsert({
    where: { id: DISCOVERY_CONFIG_ID },
    create: { id: DISCOVERY_CONFIG_ID, systemPrompt, updatedBy },
    update: { systemPrompt, updatedBy }
  })
}

export async function resetDiscoverySystemPromptOverride() {
  await prisma.discoveryConfig.deleteMany({ where: { id: DISCOVERY_CONFIG_ID } })
}
