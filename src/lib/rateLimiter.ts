// src/lib/rateLimiter.ts
// Sistema de rate limiting para APIs de autenticação com suporte a Redis

import { getRedisClient } from './redis'

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto (em ms)
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requisições por minuto

// Fallback: Store em memória (usado quando Redis não está disponível)
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}
const rateLimitStore: RateLimitStore = {}

/**
 * Limpa entradas expiradas do store em memória (fallback)
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}

/**
 * Verifica rate limit usando Redis (se disponível) ou fallback em memória
 * @param identifier Email ou IP address
 * @returns true se permitido, false se bloqueado
 */
export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
}> {
  const redis = getRedisClient()
  const now = Date.now()
  const key = `rate_limit:${identifier.toLowerCase()}`
  
  // Se Redis está disponível, usar Redis
  if (redis) {
    try {
      // Usar TTL do Redis para gerenciar expiração
      const current = await redis.get(key)
      const resetTime = now + RATE_LIMIT_WINDOW
      
      if (!current) {
        // Primeira requisição - criar entrada com TTL
        await redis.setex(key, Math.ceil(RATE_LIMIT_WINDOW / 1000), '1')
        return {
          allowed: true,
          remaining: RATE_LIMIT_MAX_REQUESTS - 1,
          resetTime
        }
      }
      
      // Incrementar contador
      const count = await redis.incr(key)
      
      // Verificar se excedeu o limite
      if (count > RATE_LIMIT_MAX_REQUESTS) {
        // Garantir que a chave não expire antes do reset
        const ttl = await redis.ttl(key)
        if (ttl < 0) {
          await redis.setex(key, Math.ceil(RATE_LIMIT_WINDOW / 1000), count.toString())
        }
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + (ttl > 0 ? ttl * 1000 : RATE_LIMIT_WINDOW)
        }
      }
      
      // Obter TTL para calcular resetTime
      const ttl = await redis.ttl(key)
      const actualResetTime = ttl > 0 ? now + (ttl * 1000) : resetTime
      
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - count,
        resetTime: actualResetTime
      }
    } catch (error) {
      // Se Redis falhar, fallback para memória
      console.error('[RateLimiter] Erro ao acessar Redis, usando fallback:', error)
      // Continuar para fallback em memória
    }
  }
  
  // Fallback: Usar store em memória
  cleanupExpiredEntries()
  
  const memoryKey = identifier.toLowerCase()
  
  // Se não existe ou expirou, criar nova entrada
  if (!rateLimitStore[memoryKey] || rateLimitStore[memoryKey].resetTime < now) {
    rateLimitStore[memoryKey] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    }
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: rateLimitStore[memoryKey].resetTime
    }
  }
  
  // Incrementar contador
  rateLimitStore[memoryKey].count++
  
  // Verificar se excedeu o limite
  if (rateLimitStore[memoryKey].count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: rateLimitStore[memoryKey].resetTime
    }
  }
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - rateLimitStore[memoryKey].count,
    resetTime: rateLimitStore[memoryKey].resetTime
  }
}

/**
 * Extrai o identificador (email ou IP) da requisição
 */
export function extractRateLimitIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown'
  
  return ip
}

/**
 * Middleware para rate limiting
 * Retorna NextResponse com status 429 se exceder o limite
 */
export async function rateLimitMiddleware(req: Request, identifier?: string): Promise<Response | null> {
  const id = identifier || extractRateLimitIdentifier(req)
  const result = await checkRateLimit(id)
  
  if (!result.allowed) {
    const resetSeconds = Math.ceil((result.resetTime - Date.now()) / 1000)
    return new Response(
      JSON.stringify({ 
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: resetSeconds
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': resetSeconds.toString(),
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        }
      }
    )
  }
  
  return null
}
