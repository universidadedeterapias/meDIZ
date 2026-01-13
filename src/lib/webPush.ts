import webpush from 'web-push'
import { prisma } from './prisma'

// Configurar VAPID keys (devem estar nas variáveis de ambiente)
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidContactEmail = process.env.VAPID_CONTACT_EMAIL || 'noreply@mediz.app'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    `mailto:${vapidContactEmail}`,
    vapidPublicKey,
    vapidPrivateKey
  )
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  url?: string
  requireInteraction?: boolean
}

/**
 * Envia notificação push para um usuário específico
 * IMPORTANTE: Funciona para TODOS os usuários (gratuitos e premium)
 * Não há verificação de assinatura - notificações são para todos
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number; errors: string[] }> {
  const isDev = process.env.NODE_ENV === 'development'
  const log = (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`[WEBPUSH] ${new Date().toISOString()} - ${message}`, data || '')
    }
  }

  log(`========== INÍCIO ENVIO NOTIFICAÇÃO ==========`, { userId })

  if (!vapidPublicKey || !vapidPrivateKey) {
    log('❌ VAPID keys não configuradas', {
      hasPublicKey: !!vapidPublicKey,
      hasPrivateKey: !!vapidPrivateKey
    })
    throw new Error('VAPID keys não configuradas. Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY')
  }

  log('✅ VAPID keys configuradas')

  // Buscar todas as subscriptions do usuário
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  })

  log(`Subscriptions encontradas para usuário`, {
    total: subscriptions.length
  })

  if (subscriptions.length === 0) {
    log(`❌ Usuário não tem subscriptions registradas`)
    return { success: 0, failed: 0, errors: ['Usuário não tem subscriptions registradas'] }
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  }

  // Preparar payload da notificação
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/imgs/logo192.png',
    badge: payload.badge || '/imgs/logo192.png',
    tag: payload.tag || 'mediz-notification',
    requireInteraction: payload.requireInteraction || false,
    data: {
      ...payload.data,
      url: payload.url || '/'
    }
  })

  // Enviar para cada subscription
  const sendPromises = subscriptions.map(async (subscription) => {
    try {
      log(`Enviando para subscription ${subscription.id}`)

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      }

      await webpush.sendNotification(pushSubscription, notificationPayload)
      log(`✅ Notificação enviada com sucesso para subscription ${subscription.id}`)
      results.success++
    } catch (error) {
      results.failed++
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      const errorDetails = error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200)
      } : {}
      
      log(`❌ Erro ao enviar para subscription ${subscription.id}`, {
        error: errorMessage,
        details: errorDetails
      })
      
      results.errors.push(`Subscription ${subscription.id}: ${errorMessage}`)

      // Se a subscription expirou ou é inválida, remover do banco
      if (
        errorMessage.includes('410') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('Gone')
      ) {
        log(`🗑️ Removendo subscription ${subscription.id} (expirada/inválida)`)
        await prisma.pushSubscription.delete({
          where: { id: subscription.id }
        }).catch((deleteError) => {
          log(`❌ Erro ao deletar subscription ${subscription.id}`, { error: deleteError })
        })
      }
    }
  })

  log('Aguardando conclusão de todos os envios...')
  await Promise.allSettled(sendPromises)

  log('========== RESULTADO FINAL ENVIO ==========', results)
  log('========== FIM ENVIO NOTIFICAÇÃO ==========')

  return results
}

/**
 * Envia notificação push para múltiplos usuários
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ totalSuccess: number; totalFailed: number; errors: string[] }> {
  const results = {
    totalSuccess: 0,
    totalFailed: 0,
    errors: [] as string[]
  }

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, payload)
    results.totalSuccess += result.success
    results.totalFailed += result.failed
    results.errors.push(...result.errors)
  }

  return results
}

/**
 * Verifica se VAPID keys estão configuradas
 */
export function isVAPIDConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey)
}

/**
 * Retorna a chave pública VAPID (para o frontend)
 */
export function getVAPIDPublicKey(): string | null {
  return vapidPublicKey || null
}

