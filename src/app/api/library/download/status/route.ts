import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/requireAuth'
import { verifyPdfDownloadToken } from '@/lib/library/pdf-download-token'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'
import { cacheKeyFor } from '@/lib/library/pdf-download-cache'
import { consultaPreparo } from '@/lib/library/prepare-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * "Já posso baixar?" — o que o cliente pergunta enquanto a cópia é marcada.
 *
 * Existe para o botão poder mostrar um estado honesto durante os ~11s de
 * marcação, em vez de segurar um request de download aberto sem trafegar nada.
 *
 * `ausente` não é erro: é o preparo que sumiu da memória do processo (deploy,
 * reinício) com o cache ainda vazio. O cliente trata como "peça de novo", e a
 * rota de download também sabe se virar sozinha nesse caso.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/download/status' })
  if (auth.ok === false) return auth.response

  const payload = verifyPdfDownloadToken(
    request.nextUrl.searchParams.get('token')
  )
  if (!payload || payload.uid !== auth.user.id) {
    return NextResponse.json(
      { error: 'TOKEN_INVALID_OR_EXPIRED' },
      { status: 401 }
    )
  }

  try {
    const { product, mediaId } = await getPdfProductForDownload(
      payload.pid,
      auth.user,
      { mediaId: payload.mid }
    )

    const { estado, erro } = await consultaPreparo(
      cacheKeyFor(auth.user.id, product.id, mediaId)
    )

    return NextResponse.json(
      { estado, ...(erro ? { erro } : {}) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    if (e instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[library/download/status]', e)
    return NextResponse.json({ error: 'DOWNLOAD_STATUS_FAILED' }, { status: 500 })
  }
}
