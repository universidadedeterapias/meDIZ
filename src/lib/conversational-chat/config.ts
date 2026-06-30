import type { ChatKind } from '@prisma/client'

export type ConversationalChatKind = Extract<
  ChatKind,
  'SEARCH' | 'SIMULADOR' | 'PROF'
>

export type MedizAgent = 'body' | 'home' | 'pet'

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
  return value === 'body' || value === 'home' || value === 'pet'
}
