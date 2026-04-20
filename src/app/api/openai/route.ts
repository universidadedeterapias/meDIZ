import { handleWebhookChatRequest } from '@/lib/webhookChatHandler'

const CHAT_WEBHOOK_URL =
  process.env.N8N_CHAT_WEBHOOK_URL ?? 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-texto'
export async function POST(req: Request) {
  return handleWebhookChatRequest(req, {
    webhookUrl: CHAT_WEBHOOK_URL,
    webhookKey: 'n8n-webhook-chat'
  })
}
