// src/lib/cache.ts
// Utilitário genérico de cache usando Redis
// Suporta TTL configurável e invalidação automática

import { getRedisClient } from './redis'

export interface CacheOptions {
  /** Tempo de vida em segundos (default: 300 = 5 minutos) */
  ttl?: number
  /** Prefixo para a chave de cache (default: 'cache') */
  prefix?: string
  /** Se deve usar JSON.stringify/parse automaticamente (default: true) */
  serialize?: boolean
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  ttl: 300, // 5 minutos
  prefix: 'cache',
  serialize: true
}

/**
 * Obtém um valor do cache
 * @param key Chave do cache
 * @param options Opções de cache
 * @returns Valor em cache ou null se não encontrado/expirado
 */
export async function getCache<T = unknown>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const redis = getRedisClient()
  if (!redis) {
    return null // Sem Redis, não há cache
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }
  const cacheKey = `${opts.prefix}:${key}`

  try {
    const cached = await redis.get(cacheKey)
    if (!cached) {
      return null
    }

    if (opts.serialize) {
      return JSON.parse(cached) as T
    }

    return cached as T
  } catch (error) {
    console.error(`[Cache] Erro ao obter cache para chave ${cacheKey}:`, error)
    return null
  }
}

/**
 * Define um valor no cache
 * @param key Chave do cache
 * @param value Valor a ser armazenado
 * @param options Opções de cache
 * @returns true se armazenado com sucesso, false caso contrário
 */
export async function setCache<T = unknown>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    return false // Sem Redis, não há cache
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }
  const cacheKey = `${opts.prefix}:${key}`

  try {
    const serialized = opts.serialize ? JSON.stringify(value) : String(value)
    await redis.setex(cacheKey, opts.ttl, serialized)
    return true
  } catch (error) {
    console.error(`[Cache] Erro ao definir cache para chave ${cacheKey}:`, error)
    return false
  }
}

/**
 * Remove um valor do cache
 * @param key Chave do cache
 * @param options Opções de cache (para obter o prefixo)
 * @returns true se removido com sucesso, false caso contrário
 */
export async function deleteCache(
  key: string,
  options: CacheOptions = {}
): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }
  const cacheKey = `${opts.prefix}:${key}`

  try {
    await redis.del(cacheKey)
    return true
  } catch (error) {
    console.error(`[Cache] Erro ao deletar cache para chave ${cacheKey}:`, error)
    return false
  }
}

/**
 * Remove múltiplas chaves do cache usando um padrão
 * @param pattern Padrão de chaves (ex: 'dashboard:*')
 * @param options Opções de cache (para obter o prefixo)
 * @returns Número de chaves removidas
 */
export async function deleteCachePattern(
  pattern: string,
  options: CacheOptions = {}
): Promise<number> {
  const redis = getRedisClient()
  if (!redis) {
    return 0
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }
  const cachePattern = `${opts.prefix}:${pattern}`

  try {
    const keys = await redis.keys(cachePattern)
    if (keys.length === 0) {
      return 0
    }

    await redis.del(...keys)
    return keys.length
  } catch (error) {
    console.error(`[Cache] Erro ao deletar cache com padrão ${cachePattern}:`, error)
    return 0
  }
}

/**
 * Wrapper para executar uma função com cache
 * Se o valor estiver em cache, retorna do cache
 * Caso contrário, executa a função, armazena no cache e retorna o resultado
 * 
 * @param key Chave do cache
 * @param fn Função que retorna o valor a ser cacheado
 * @param options Opções de cache
 * @returns Valor do cache ou resultado da função
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Tentar obter do cache primeiro
  const cached = await getCache<T>(key, options)
  if (cached !== null) {
    return cached
  }

  // Se não estiver em cache, executar função
  const result = await fn()

  // Armazenar no cache (não bloquear se falhar)
  setCache(key, result, options).catch((error) => {
    console.error(`[Cache] Erro ao armazenar resultado no cache para ${key}:`, error)
  })

  return result
}

/**
 * Invalida todo o cache de um prefixo específico
 * @param prefix Prefixo a ser invalidado (ex: 'dashboard')
 * @returns Número de chaves removidas
 */
export async function invalidateCachePrefix(prefix: string): Promise<number> {
  return deleteCachePattern('*', { prefix })
}
