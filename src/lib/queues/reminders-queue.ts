/**
 * Fila de Lembretes usando BullMQ
 * 
 * Processa lembretes de forma assíncrona para evitar timeouts
 * em lembretes globais com muitos usuários
 */

import { Queue } from 'bullmq'
import { getBullMqRedisConnection } from '@/lib/bullmq-connection'

const redisConnection = getBullMqRedisConnection()

if (!redisConnection) {
  if (process.env.npm_lifecycle_event !== 'build') {
    console.warn('[RemindersQueue] REDIS_URL não configurada ou indisponível. Filas não funcionarão.')
  }
}

/**
 * Fila de lembretes
 * Processa envio de notificações push para lembretes
 */
export const remindersQueue = redisConnection
  ? new Queue('reminders', {
      connection: redisConnection,
      defaultJobOptions: {
        // Retry automático em caso de falha
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000 // 2s, 4s, 8s
        },
        // Remover job após 24 horas (mesmo se falhar)
        removeOnComplete: {
          age: 24 * 3600, // 24 horas
          count: 1000 // Manter últimos 1000 jobs completos
        },
        removeOnFail: {
          age: 7 * 24 * 3600 // 7 dias para jobs falhados (para debug)
        }
      }
    })
  : null

/**
 * Adiciona um lembrete à fila para processamento
 */
export async function enqueueReminder(reminderId: string, userId: string | null) {
  if (!remindersQueue) {
    throw new Error('Redis não disponível. Não é possível enfileirar lembretes.')
  }

  return await remindersQueue.add(
    'send-reminder',
    {
      reminderId,
      userId // null = lembrete global
    },
    {
      // Prioridade: lembretes individuais têm prioridade maior
      priority: userId ? 10 : 1,
      // Job ID único para evitar duplicatas
      jobId: `reminder-${reminderId}-${Date.now()}`
    }
  )
}

/**
 * Adiciona múltiplos lembretes à fila
 */
export async function enqueueReminders(reminders: Array<{ reminderId: string; userId: string | null }>) {
  if (!remindersQueue) {
    throw new Error('Redis não disponível. Não é possível enfileirar lembretes.')
  }

  const jobs = reminders.map(({ reminderId, userId }) => ({
    name: 'send-reminder',
    data: { reminderId, userId },
    opts: {
      priority: userId ? 10 : 1,
      jobId: `reminder-${reminderId}-${Date.now()}`
    }
  }))

  return await remindersQueue.addBulk(jobs)
}

/**
 * Obtém estatísticas da fila
 */
export async function getQueueStats() {
  if (!remindersQueue) {
    return null
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    remindersQueue.getWaitingCount(),
    remindersQueue.getActiveCount(),
    remindersQueue.getCompletedCount(),
    remindersQueue.getFailedCount(),
    remindersQueue.getDelayedCount()
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  }
}

/**
 * Limpa jobs antigos da fila
 */
export async function cleanQueue() {
  if (!remindersQueue) {
    return
  }

  // Limpar jobs completos com mais de 7 dias
  await remindersQueue.clean(7 * 24 * 3600 * 1000, 1000, 'completed')
  
  // Limpar jobs falhados com mais de 30 dias
  await remindersQueue.clean(30 * 24 * 3600 * 1000, 1000, 'failed')
}
