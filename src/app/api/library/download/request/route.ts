import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/requireAuth'
import { createPdfDownloadToken } from '@/lib/library/pdf-download-token'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  productId: z.string().uuid('productId inválido'),
  /** Material específico do curso (`CatalogModuleMedia.id`); ausente = primeiro PDF. */
  mediaId: z.string().trim().min(1).max(100).optional()
})

export async function POST(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/download/request' })
  if (auth.ok === false) return auth.response

  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Resolve aqui para (a) validar acesso antes de emitir o token e (b) gravar
    // no token o material que de fato foi resolvido, não o pedido cru.
    const { mediaId } = await getPdfProductForDownload(
      parsed.data.productId,
      auth.user,
      { mediaId: parsed.data.mediaId }
    )

    const { token, expiresAt } = await createPdfDownloadToken(
      auth.user.id,
      parsed.data.productId,
      mediaId
    )

    const origin =
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin

    return NextResponse.json(
      {
        downloadUrl: `${origin}/api/library/download/file?token=${encodeURIComponent(token)}`,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000)
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    if (e instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[library/download/request]', e)
    return NextResponse.json({ error: 'DOWNLOAD_REQUEST_FAILED' }, { status: 500 })
  }
}
