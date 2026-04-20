import { handleWebhookChatRequest } from '@/lib/webhookChatHandler'

const MEATENDE_WEBHOOK_URL =
  process.env.N8N_MEATENDE_WEBHOOK_URL ??
  'https://mediz-n8n.gjhi7d.easypanel.host/webhook/3bfec4b0-7cf7-443c-a73f-e4dcfa899c7c'

export async function POST(req: Request) {
  return handleWebhookChatRequest(req, {
    webhookUrl: MEATENDE_WEBHOOK_URL,
    webhookKey: 'n8n-webhook-meatende',
    reuseThreadFromRequest: true
  })
}
