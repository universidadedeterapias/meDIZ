import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000

/** Réplica única assumida (sem docker-compose com múltiplas réplicas hoje). */
function cacheRoot(): string {
  return process.env.PDF_DOWNLOAD_CACHE_DIR || path.join(os.tmpdir(), 'mediz-pdf-cache')
}

/** Chave inclui o mês corrente para não misturar cache com a janela de cota mensal. */
export function cacheKeyFor(
  userId: string,
  productId: string,
  watermarkVersion = 'v1'
): string {
  const month = new Date().toISOString().slice(0, 7)
  const raw = `${userId}:${productId}:${watermarkVersion}:${month}`
  return createHash('sha256').update(raw).digest('hex')
}

export function getCachedPath(key: string): string {
  return path.join(cacheRoot(), `${key}.pdf`)
}

export async function isCacheFresh(key: string, ttlMs = DEFAULT_TTL_MS): Promise<boolean> {
  try {
    const stat = await fs.stat(getCachedPath(key))
    return Date.now() - stat.mtimeMs < ttlMs
  } catch {
    return false
  }
}

/** Escreve em arquivo temporário e faz rename atômico, evitando servir um arquivo parcial. */
export async function writeCacheAtomically(key: string, bytes: Uint8Array): Promise<string> {
  const root = cacheRoot()
  await fs.mkdir(root, { recursive: true })
  const finalPath = getCachedPath(key)
  const tmpPath = path.join(
    root,
    `${key}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  )
  await fs.writeFile(tmpPath, bytes)
  await fs.rename(tmpPath, finalPath)
  return finalPath
}

/** Chamado com amostragem (não em toda request) por quem consome o cache. */
export async function pruneExpiredCacheEntries(ttlMs = DEFAULT_TTL_MS): Promise<void> {
  const root = cacheRoot()
  let entries: string[]
  try {
    entries = await fs.readdir(root)
  } catch {
    return
  }

  const now = Date.now()
  await Promise.all(
    entries
      .filter((name) => name.endsWith('.pdf'))
      .map(async (name) => {
        const filePath = path.join(root, name)
        try {
          const stat = await fs.stat(filePath)
          if (now - stat.mtimeMs >= ttlMs) {
            await fs.unlink(filePath)
          }
        } catch {
          // arquivo já removido por outra request concorrente — ignora
        }
      })
  )
}
