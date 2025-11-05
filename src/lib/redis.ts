// src/lib/redis.ts
// Cliente Redis reutilizável para rate limiting e bloqueio de IPs

import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Obtém ou cria uma instância do cliente Redis
 * Singleton pattern para reutilizar a conexão
 */
export function getRedisClient(): Redis | null {
  // Se já existe uma instância, retornar
  if (redis) {
    return redis
  }

  // Verificar se Redis está configurado
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    // Em desenvolvimento sem Redis, retornar null (fallback para memória)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Redis] REDIS_URL não configurada. Usando fallback em memória.')
      return null
    }
    // Em produção sem Redis, lançar erro
    throw new Error('REDIS_URL não configurada. Redis é obrigatório em produção.')
  }

  try {
    // Criar cliente Redis
    redis = new Redis(redisUrl, {
      // Configurações recomendadas para produção
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null // Parar retry após 3 tentativas
        }
        const delay = Math.min(times * 50, 2000) // Exponential backoff
        return delay
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          return true // Reconectar quando Redis está em modo readonly
        }
        return false
      },
      // Configurações para serverless (Vercel)
      lazyConnect: true,
      enableReadyCheck: false,
      enableOfflineQueue: false
    })

    // Event handlers (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      redis.on('error', (err) => {
        console.error('[Redis] Erro de conexão:', err.message)
      })

      redis.on('connect', () => {
        console.log('[Redis] Conectado com sucesso')
      })

      redis.on('ready', () => {
        console.log('[Redis] Pronto para uso')
      })
    }

    // Com lazyConnect: true, a conexão é feita automaticamente na primeira operação
    // Não precisa chamar connect() explicitamente
    
    return redis
  } catch (error) {
    console.error('[Redis] Erro ao criar cliente:', error)
    return null
  }
}

/**
 * Fecha a conexão Redis (útil para cleanup em testes)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

/**
 * Verifica se Redis está disponível e conectado
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.ping()
    return true
  } catch {
    return false
  }
}

