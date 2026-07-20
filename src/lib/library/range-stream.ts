import { createReadStream, promises as fs } from 'fs'
import { NextResponse } from 'next/server'

export function parseRangeHeader(
  rangeHeader: string | null,
  size: number
): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null
  const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
  const start = Number.parseInt(startStr, 10)
  const end = endStr ? Number.parseInt(endStr, 10) : size - 1
  if (Number.isNaN(start) || start < 0 || end < start || end >= size) {
    return null
  }
  return { start, end }
}

/**
 * Serve um arquivo local com suporte a Range/206, reaproveitado tanto pelo
 * preview (`stream/route.ts`) quanto pelo download de PDF (`file/route.ts`).
 * `baseHeaders` define Content-Type/Content-Disposition/etc. do chamador;
 * Accept-Ranges/Content-Range/Content-Length são sempre calculados aqui.
 */
export async function streamFileResponse(
  absolutePath: string,
  rangeHeader: string | null,
  baseHeaders: Record<string, string>
): Promise<NextResponse> {
  const stat = await fs.stat(absolutePath)
  const range = parseRangeHeader(rangeHeader, stat.size)
  const headers = new Headers(baseHeaders)
  headers.set('Accept-Ranges', 'bytes')

  if (range) {
    const chunkSize = range.end - range.start + 1
    const stream = createReadStream(absolutePath, { start: range.start, end: range.end })
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`)
    headers.set('Content-Length', String(chunkSize))
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers
    })
  }

  headers.set('Content-Length', String(stat.size))
  const stream = createReadStream(absolutePath)
  return new NextResponse(stream as unknown as ReadableStream, { status: 200, headers })
}
