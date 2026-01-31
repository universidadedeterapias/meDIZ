/**
 * Worker para processar lembretes da fila
 * 
 * Este worker processa jobs da fila de lembretes de forma assíncrona
 * Pode rodar em Vercel Cron ou em servidor separado
 */

import { Worker, Job } from 'bullmq'
import { prisma } from '../prisma'
import { sendPushNotification } from '../webPush'

interface ReminderJobData {
  reminderId: string
  userId: string | null // null = lembrete global
}

// Configurar conexão Redis para BullMQ
function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return null
  }

  // Se é URL completa (Upstash, Redis Cloud, etc.)
  if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
    return { url: redisUrl }
  }

  // Se é formato host:port (não recomendado, mas suportado)
  const parts = redisUrl.split(':')
  if (parts.length === 2) {
    return {
      host: parts[0],
      port: parseInt(parts[1], 10)
    }
  }

  return null
}

const redisConnection = getRedisConnection()

if (!redisConnection) {
  console.warn('[ReminderWorker] REDIS_URL não configurada. Worker não será criado.')
}

/**
 * Worker para processar lembretes
 */
export const reminderWorker = redisConnection
  ? new Worker<ReminderJobData>(
      'reminders',
      async (job: Job<ReminderJobData>) => {
        const { reminderId, userId } = job.data

        console.log(`[ReminderWorker] Processando lembrete ${reminderId} para usuário ${userId || 'GLOBAL'}`)

        try {
          // Buscar lembrete no banco
          const reminder = await prisma.reminder.findUnique({
            where: { id: reminderId }
          })

          if (!reminder) {
            throw new Error(`Lembrete ${reminderId} não encontrado`)
          }

          if (!reminder.active) {
            throw new Error(`Lembrete ${reminderId} está inativo`)
          }

          // Preparar payload da notificação
          const payload = {
            title: reminder.title,
            body: reminder.message,
            icon: '/imgs/logo192.png',
            badge: '/imgs/logo192.png',
            tag: `reminder-${reminder.id}`,
            data: {
              reminderId: reminder.id,
              type: 'reminder'
            },
            url: '/'
          }

          let sent = 0
          let failed = 0

          // Se é lembrete global (userId === null)
          if (userId === null) {
            // Buscar todos os usuários em batches
            const BATCH_SIZE = 50
            let offset = 0
            let hasMore = true

            while (hasMore) {
              const users = await prisma.user.findMany({
                select: { id: true },
                take: BATCH_SIZE,
                skip: offset
              })

              if (users.length === 0) {
                hasMore = false
                break
              }

              // Processar batch
              const batchResults = await Promise.allSettled(
                users.map(async (user) => {
                  const result = await sendPushNotification(user.id, payload)
                  return result
                })
              )

              // Contar sucessos e falhas
              batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                  sent += result.value.success
                  failed += result.value.failed
                } else {
                  failed++
                }
              })

              offset += BATCH_SIZE
              hasMore = users.length === BATCH_SIZE
            }
          } else {
            // Lembrete individual
            const result = await sendPushNotification(userId, payload)
            sent = result.success
            failed = result.failed
          }

          // Atualizar lastSentAt se pelo menos uma notificação foi enviada
          if (sent > 0) {
            await prisma.reminder.update({
              where: { id: reminderId },
              data: { lastSentAt: new Date() }
            })
          }

          console.log(`[ReminderWorker] ✅ Lembrete ${reminderId} processado: ${sent} enviadas, ${failed} falhas`)

          return {
            success: true,
            sent,
            failed,
            reminderId
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          console.error(`[ReminderWorker] ❌ Erro ao processar lembrete ${reminderId}:`, errorMessage)
          throw error // Re-throw para que BullMQ tente novamente
        }
      },
      {
        connection: redisConnection,
        concurrency: 5, // Processar até 5 lembretes simultaneamente
        limiter: {
          max: 10, // Máximo 10 jobs
          duration: 1000 // por segundo
        }
      }
    )
  : null

// Event handlers
if (reminderWorker) {
  reminderWorker.on('completed', (job) => {
    console.log(`[ReminderWorker] ✅ Job ${job.id} completado`)
  })

  reminderWorker.on('failed', (job, err) => {
    console.error(`[ReminderWorker] ❌ Job ${job?.id} falhou:`, err.message)
  })

  reminderWorker.on('error', (err) => {
    console.error('[ReminderWorker] ❌ Erro no worker:', err)
  })
}

/**
 * Fecha o worker (útil para cleanup)
 */
export async function closeReminderWorker() {
  if (reminderWorker) {
    await reminderWorker.close()
  }
}
