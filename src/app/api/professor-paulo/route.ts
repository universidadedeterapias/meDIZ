import { handleWebhookChatRequest } from '@/lib/webhookChatHandler'

const PROFESSOR_PAULO_WEBHOOK_URL =
  process.env.N8N_PROFESSOR_PAULO_WEBHOOK_URL ??
  'https://mediz-n8n.gjhi7d.easypanel.host/webhook/c7d2b3a1-a8a6-4b70-9e2d-77c66b3a7173'

export async function POST(req: Request) {
  return handleWebhookChatRequest(req, {
    webhookUrl: PROFESSOR_PAULO_WEBHOOK_URL,
    webhookKey: 'n8n-webhook-professor-paulo',
    reuseThreadFromRequest: true
  })
}
