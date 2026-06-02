// src/lib/ipBlocker.ts
// Sistema de bloqueio automático por IP após múltiplas tentativas com suporte a Redis

import { getRedisClient } from './redis'

const BLOCK_DURATION = 15 * 60 // 15 minutos (em segundos para Redis TTL)
const MAX_ATTEMPTS = 5 // Bloquear após 5 tentativas

// Fallback: Store em memória (usado quando Redis não está disponível)
interface BlockedIP {
  ip: string
  blockedUntil: number
  attempts: number
}
const blockedIPs: Map<string, BlockedIP> = new Map()

/**
 * Verifica se um IP está bloqueado usando Redis ou fallback em memória
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  const redis = getRedisClient()
  
  // Se Redis está disponível, usar Redis
  if (redis) {
    try {
      const blockKey = `ip_block:${ip}`
      const attemptsKey = `ip_attempts:${ip}`
      
      // Verificar se IP está bloqueado
      const blockedUntil = await redis.get(blockKey)
      if (blockedUntil) {
        const until = parseInt(blockedUntil)
        if (until > Date.now()) {
          return true // Ainda bloqueado
        } else {
          // Bloqueio expirou, limpar
          await redis.del(blockKey)
          await redis.del(attemptsKey)
          return false
        }
      }
      
      return false
    } catch (error) {
      // Se Redis falhar, usar fallback
      console.error('[IPBlocker] Erro ao acessar Redis, usando fallback:', error)
      // Continuar para fallback
    }
  }
  
  // Fallback: Usar store em memória
  const blocked = blockedIPs.get(ip)
  if (!blocked) return false
  
  const now = Date.now()
  if (blocked.blockedUntil < now) {
    blockedIPs.delete(ip)
    return false
  }
  
  return true
}

/**
 * Registra uma tentativa de login falhada para um IP
 * Retorna true se o IP deve ser bloqueado
 */
export async function recordFailedAttempt(ip: string): Promise<boolean> {
  const redis = getRedisClient()
  const now = Date.now()
  
  // Se Redis está disponível, usar Redis
  if (redis) {
    try {
      const attemptsKey = `ip_attempts:${ip}`
      const blockKey = `ip_block:${ip}`
      
      // Verificar se já está bloqueado
      const blockedUntil = await redis.get(blockKey)
      if (blockedUntil && parseInt(blockedUntil) > now) {
        // Já está bloqueado
        return true
      }
      
      // Incrementar tentativas
      const attempts = await redis.incr(attemptsKey)
      
      // Se é a primeira tentativa, definir TTL (15 minutos para limpar tentativas)
      if (attempts === 1) {
        await redis.expire(attemptsKey, 900) // 15 minutos
      }
      
      // Se atingiu o limite, bloquear
      if (attempts >= MAX_ATTEMPTS) {
        const blockUntil = now + (BLOCK_DURATION * 1000)
        await redis.setex(blockKey, BLOCK_DURATION, blockUntil.toString())
        return true
      }
      
      return false
    } catch (error) {
      // Se Redis falhar, usar fallback
      console.error('[IPBlocker] Erro ao acessar Redis, usando fallback:', error)
      // Continuar para fallback
    }
  }
  
  // Fallback: Usar store em memória
  const blocked = blockedIPs.get(ip)
  
  if (!blocked || blocked.blockedUntil < now) {
    // Primeira tentativa ou bloqueio expirado
    blockedIPs.set(ip, {
      ip,
      blockedUntil: 0,
      attempts: 1
    })
    return false
  }
  
  // Incrementar tentativas
  blocked.attempts++
  
  // Se atingiu o limite, bloquear
  if (blocked.attempts >= MAX_ATTEMPTS) {
    blocked.blockedUntil = now + (BLOCK_DURATION * 1000)
    return true
  }
  
  return false
}

/**
 * Remove bloqueio de um IP (útil para testes ou desbloqueio manual)
 */
export async function unblockIP(ip: string): Promise<void> {
  const redis = getRedisClient()
  
  if (redis) {
    try {
      await redis.del(`ip_block:${ip}`)
      await redis.del(`ip_attempts:${ip}`)
      return
    } catch (error) {
      console.error('[IPBlocker] Erro ao desbloquear no Redis:', error)
    }
  }
  
  // Fallback: Remover da memória
  blockedIPs.delete(ip)
}

/**
 * Retorna informações sobre o bloqueio de um IP
 */
export async function getIPBlockInfo(ip: string): Promise<{
  blocked: boolean
  attempts: number
  blockedUntil: Date | null
  remainingTime: number | null
}> {
  const redis = getRedisClient()
  
  if (redis) {
    try {
      const blockKey = `ip_block:${ip}`
      const attemptsKey = `ip_attempts:${ip}`
      
      const blockedUntilStr = await redis.get(blockKey)
      const attemptsStr = await redis.get(attemptsKey)
      
      const attempts = attemptsStr ? parseInt(attemptsStr) : 0
      const now = Date.now()
      
      if (blockedUntilStr) {
        const blockedUntil = parseInt(blockedUntilStr)
        if (blockedUntil > now) {
          return {
            blocked: true,
            attempts,
            blockedUntil: new Date(blockedUntil),
            remainingTime: Math.ceil((blockedUntil - now) / 1000)
          }
        }
      }
      
      return {
        blocked: false,
        attempts,
        blockedUntil: null,
        remainingTime: null
      }
    } catch (error) {
      console.error('[IPBlocker] Erro ao obter info do Redis:', error)
      // Continuar para fallback
    }
  }
  
  // Fallback: Usar store em memória
  const blocked = blockedIPs.get(ip)
  if (!blocked) {
    return {
      blocked: false,
      attempts: 0,
      blockedUntil: null,
      remainingTime: null
    }
  }
  
  const now = Date.now()
  const isBlocked = blocked.blockedUntil > now
  
  return {
    blocked: isBlocked,
    attempts: blocked.attempts,
    blockedUntil: isBlocked ? new Date(blocked.blockedUntil) : null,
    remainingTime: isBlocked ? Math.ceil((blocked.blockedUntil - now) / 1000) : null
  }
}

/**
 * Limpa bloqueios expirados (chamar periodicamente)
 */
export async function cleanupExpiredBlocks(): Promise<void> {
  const redis = getRedisClient()
  
  if (redis) {
    try {
      // Redis gerencia TTL automaticamente, mas podemos limpar chaves órfãs
      // Por enquanto, Redis cuida disso automaticamente via TTL
      // Se precisar de limpeza manual aqui, adicionar lógica específica
      // Não retornar aqui - continuar para fallback mesmo com Redis disponível
    } catch {
      console.error('[IPBlocker] Erro ao limpar no Redis')
      // Se houver erro no Redis, continuar para fallback
    }
  }
  
  // Fallback: Limpar da memória (sempre executado se redis não existir ou se houver erro)
  const now = Date.now()
  for (const [ip, blocked] of blockedIPs.entries()) {
    if (blocked.blockedUntil < now && blocked.attempts < MAX_ATTEMPTS) {
      blockedIPs.delete(ip)
    }
  }
}

/**
 * Retorna lista de IPs bloqueados
 */
export async function getBlockedIPs(): Promise<Array<{
  ip: string
  attempts: number
  blockedUntil: Date
}>> {
  const redis = getRedisClient()
  
  if (redis) {
    try {
      const keys = await redis.keys('ip_block:*')
      const blocked: Array<{ ip: string; attempts: number; blockedUntil: Date }> = []
      const now = Date.now()
      
      for (const key of keys) {
        const ip = key.replace('ip_block:', '')
        const blockedUntilStr = await redis.get(key)
        const attemptsKey = `ip_attempts:${ip}`
        const attemptsStr = await redis.get(attemptsKey)
        
        if (blockedUntilStr) {
          const blockedUntil = parseInt(blockedUntilStr)
          if (blockedUntil > now) {
            blocked.push({
              ip,
              attempts: attemptsStr ? parseInt(attemptsStr) : MAX_ATTEMPTS,
              blockedUntil: new Date(blockedUntil)
            })
          }
        }
      }
      
      return blocked
    } catch (error) {
      console.error('[IPBlocker] Erro ao listar bloqueios do Redis:', error)
      // Continuar para fallback
    }
  }
  
  // Fallback: Usar store em memória
  const now = Date.now()
  const blocked: Array<{ ip: string; attempts: number; blockedUntil: Date }> = []
  
  for (const [ip, block] of blockedIPs.entries()) {
    if (block.blockedUntil > now) {
      blocked.push({
        ip,
        attempts: block.attempts,
        blockedUntil: new Date(block.blockedUntil)
      })
    }
  }
  
  return blocked
}
