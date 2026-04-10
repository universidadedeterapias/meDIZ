/**
 * Conexão Redis para BullMQ. Durante `next build` não criamos clientes
 * (evita ECONNRESET / ruído quando a rota é carregada no collect de dados).
 */
function isNextBuildProcess(): boolean {
  if (process.env.npm_lifecycle_event === 'build') return true
  const argv = process.argv
  if (!argv.includes('build')) return false
  return argv.some(
    (a) => a === 'next' || /[/\\]next(\.cmd)?$/i.test(a) || /next[\\/]dist[\\/]bin[\\/]next/i.test(a)
  )
}

export function getBullMqRedisConnection():
  | { url: string }
  | { host: string; port: number }
  | null {
  if (isNextBuildProcess()) {
    return null
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return null
  }

  if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
    return { url: redisUrl }
  }

  const parts = redisUrl.split(':')
  if (parts.length === 2) {
    return {
      host: parts[0],
      port: parseInt(parts[1], 10)
    }
  }

  return null
}
