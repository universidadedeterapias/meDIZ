import type { ChatKind } from '@prisma/client'

export type ConversationalChatKind = Extract<
  ChatKind,
  'SEARCH' | 'SIMULADOR' | 'PROF'
>

export type SpecialistAgent = 'body' | 'home' | 'pet'
export type MedizAgent = 'concierge' | SpecialistAgent
export type ConciergeEntryPoint = 'free' | 'pain' | 'talk' | 'research'
export type ConciergeDestination =
  | 'medizpesquisa'
  | 'minha_casa'
  | 'meu_pet'
  | 'meatende'
  | 'simulador'
  | 'professor'
  | 'indefinido'

export type ConciergeRouteStatus =
  | 'collecting'
  | 'awaiting_confirmation'
  | 'ready_to_route'
  | 'needs_selection'

export function destinationToSpecialist(
  destination: ConciergeDestination
): SpecialistAgent | null {
  if (destination === 'medizpesquisa') return 'body'
  if (destination === 'minha_casa') return 'home'
  if (destination === 'meu_pet') return 'pet'
  return null
}

const AGENT_WELCOME_MESSAGES: Record<MedizAgent, string> = {
  concierge: 'Conte o que está acontecendo. Eu vou encontrar o melhor caminho para você.',
  body: 'O que você está sentindo e gostaria de compreender melhor?',
  home: 'O que aconteceu na sua casa e chamou a sua atenção?',
  pet: 'O que você percebeu no seu pet e gostaria de compreender melhor?'
}

export function getAgentWelcomeMessage(agent: MedizAgent): string {
  return AGENT_WELCOME_MESSAGES[agent]
}

export function getConciergeEntryMessage(entryPoint: ConciergeEntryPoint) {
  if (entryPoint === 'pain') return 'Sinto muito. Pode me falar mais sobre essa dor?'
  if (entryPoint === 'talk') return 'Estou aqui. Sobre o que você quer conversar?'
  if (entryPoint === 'research') return 'Claro! Sobre o que você quer pesquisar?'
  return getAgentWelcomeMessage('concierge')
}

export const CONVERSATIONAL_CHAT_WEBHOOKS: Record<
  ConversationalChatKind,
  { envKey: string; fallbackUrl: string }
> = {
  SEARCH: {
    envKey: 'N8N_CHAT_WEBHOOK_URL_V2',
    fallbackUrl: 'https://uniterapias.app.n8n.cloud/webhook/chat-texto-v2'
  },
  SIMULADOR: {
    envKey: 'N8N_SIMULADOR_WEBHOOK_URL',
    fallbackUrl:
      'https://mediz-n8n.gjhi7d.easypanel.host/webhook/3bfec4b0-7cf7-443c-a73f-e4dcfa899c7c'
  },
  PROF: {
    envKey: 'N8N_PROFESSOR_PAULO_WEBHOOK_URL',
    fallbackUrl:
      'https://mediz-n8n.gjhi7d.easypanel.host/webhook/c7d2b3a1-a8a6-4b70-9e2d-77c66b3a7173'
  }
}

export function getConversationalWebhookUrl(
  chatKind: ConversationalChatKind
): string {
  const config = CONVERSATIONAL_CHAT_WEBHOOKS[chatKind]
  const fromEnv =
    process.env[config.envKey]?.trim() ||
    (chatKind === 'SIMULADOR'
      ? process.env.N8N_MEATENDE_WEBHOOK_URL?.trim()
      : undefined)
  return fromEnv || config.fallbackUrl
}

export function isConversationalChatKind(
  value: string
): value is ConversationalChatKind {
  return value === 'SEARCH' || value === 'SIMULADOR' || value === 'PROF'
}

export function isMedizAgent(value: string): value is MedizAgent {
  return value === 'concierge' || isSpecialistAgent(value)
}

export function isSpecialistAgent(value: string): value is SpecialistAgent {
  return value === 'body' || value === 'home' || value === 'pet'
}
