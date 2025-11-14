import { prisma } from './prisma'

const DEFAULT_CACHE_MIN_LENGTH = 1500
const DEFAULT_CACHE_TTL_HOURS = 24 * 30

export function normalizeSymptom(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

interface CacheDecisionOptions {
  normalizedQuestion?: string
}

function parseEnvPatterns(envName: string) {
  const raw = process.env[envName]
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map(item => normalizeSymptom(item))
    .filter(Boolean)
}

const FORCE_PATTERNS = parseEnvPatterns('CHAT_CACHE_FORCE_PATTERNS')
const SKIP_PATTERNS = parseEnvPatterns('CHAT_CACHE_SKIP_PATTERNS')

function matchesPattern(
  patterns: string[],
  normalizedQuestion: string,
  normalizedResponse: string
) {
  if (!patterns.length) {
    return false
  }

  return patterns.some(pattern => {
    if (!pattern) return false
    return (
      normalizedQuestion.includes(pattern) ||
      normalizedResponse.includes(pattern)
    )
  })
}

export function shouldCacheResponse(
  content: string,
  options: CacheDecisionOptions = {}
) {
  const trimmed = content.trim()
  if (!trimmed) {
    return false
  }

  const normalizedResponse = normalizeSymptom(trimmed)
  const normalizedQuestion = options.normalizedQuestion ?? ''

  if (
    matchesPattern(SKIP_PATTERNS, normalizedQuestion, normalizedResponse)
  ) {
    return false
  }

  if (
    matchesPattern(FORCE_PATTERNS, normalizedQuestion, normalizedResponse)
  ) {
    return true
  }

  const minLength =
    Number(process.env.CHAT_CACHE_MIN_LENGTH) || DEFAULT_CACHE_MIN_LENGTH
  return normalizedResponse.length >= minLength
}

export async function getCachedAssistantResponse(normalizedKey: string) {
  if (!normalizedKey) {
    return null
  }

  const cacheEntry = await prisma.chatAnswerCache.findUnique({
    where: { normalizedKey }
  })

  if (!cacheEntry) {
    return null
  }

  if (cacheEntry.expiresAt && cacheEntry.expiresAt <= new Date()) {
    await prisma.chatAnswerCache.delete({ where: { normalizedKey } })
    return null
  }

  return cacheEntry.content
}

interface SaveCachedAssistantResponseParams {
  normalizedKey: string
  content: string
  sourceThreadId: string
}

function resolveCacheTtlHours() {
  const rawTtl = process.env.CHAT_CACHE_TTL_HOURS
  if (!rawTtl) {
    return DEFAULT_CACHE_TTL_HOURS
  }

  const parsed = Number(rawTtl)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_CACHE_TTL_HOURS
}

function calculateExpirationDate() {
  const ttlHours = resolveCacheTtlHours()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)
  return expiresAt
}

export async function saveCachedAssistantResponse({
  normalizedKey,
  content,
  sourceThreadId
}: SaveCachedAssistantResponseParams) {
  if (!normalizedKey) {
    return
  }

  await prisma.chatAnswerCache.upsert({
    where: { normalizedKey },
    update: {
      content,
      contentLength: content.length,
      sourceThreadId,
      expiresAt: calculateExpirationDate()
    },
    create: {
      normalizedKey,
      content,
      contentLength: content.length,
      sourceThreadId,
      expiresAt: calculateExpirationDate()
    }
  })
}

