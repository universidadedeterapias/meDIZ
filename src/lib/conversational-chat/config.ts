import type { ChatKind } from '@prisma/client'

export type ConversationalChatKind = Extract<ChatKind, 'SIMULADOR' | 'PROF'>

export const CONVERSATIONAL_CHAT_WEBHOOKS: Record<
  ConversationalChatKind,
  { envKey: string; fallbackUrl: string }
> = {
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
  return value === 'SIMULADOR' || value === 'PROF'
}
