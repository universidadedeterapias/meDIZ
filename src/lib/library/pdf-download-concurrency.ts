const MAX_CONCURRENT_GENERATIONS = Number.parseInt(
  process.env.PDF_DOWNLOAD_MAX_CONCURRENT_GENERATIONS ?? '2',
  10
)

const MAX_SOURCE_BYTES = Number.parseInt(
  process.env.PDF_DOWNLOAD_MAX_SOURCE_BYTES ?? String(300 * 1024 * 1024),
  10
)

let active = 0
const waiters: Array<() => void> = []

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT_GENERATIONS) {
    active += 1
    return
  }
  await new Promise<void>((resolve) => waiters.push(resolve))
  active += 1
}

function release(): void {
  active -= 1
  const next = waiters.shift()
  if (next) next()
}

/**
 * Limita quantas gerações de PDF (fetch + watermark) rodam ao mesmo tempo
 * neste processo, pra conter o pico de memória num container de réplica única.
 * Cache hits não passam por aqui — só a geração pesada.
 */
export async function withPdfGenerationSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire()
  try {
    return await fn()
  } finally {
    release()
  }
}

export class PdfSourceTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super('PDF_SOURCE_TOO_LARGE')
    this.name = 'PdfSourceTooLargeError'
  }
}

export function assertPdfSourceSize(byteLength: number): void {
  if (byteLength > MAX_SOURCE_BYTES) {
    throw new PdfSourceTooLargeError(MAX_SOURCE_BYTES)
  }
}
