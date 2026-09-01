import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/requireAuth'
import { createPdfDownloadToken } from '@/lib/library/pdf-download-token'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'
import {
  assertPdfDownloadQuota,
  PdfDownloadQuotaError
} from '@/lib/library/pdf-download-limits'
import { cacheKeyFor } from '@/lib/library/pdf-download-cache'
import { iniciaPreparo } from '@/lib/library/prepare-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  productId: z.string().uuid('productId inválido'),
  /** Material específico do curso (`CatalogModuleMedia.id`); ausente = primeiro PDF. */
  mediaId: z.string().trim().min(1).max(100).optional()
})

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

/**
 * Pede a cópia licenciada e já coloca a geração em andamento.
 *
 * A marcação de 180 páginas leva ~11s mesmo com o PDF otimizado, e antes ela
 * acontecia dentro do request de download — 11 segundos sem um byte trafegando,
 * que é exatamente onde o navegador do celular e as proxies desistem. Agora o
 * trabalho começa aqui, o cliente acompanha por `statusUrl`, e o download só
 * começa quando o arquivo existe.
 */
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
    const { product, downloadTitle, mediaId, locale } =
      await getPdfProductForDownload(parsed.data.productId, auth.user, {
        mediaId: parsed.data.mediaId
      })

    const cacheKey = cacheKeyFor(auth.user.id, product.id, mediaId)

    // A cota é checada antes de gerar, e não depois: recusar um arquivo que já
    // custou 11s de CPU seria gastar o recurso duas vezes. Quem já tem a cópia
    // deste mês em cache não consome cota nenhuma — é o mesmo arquivo.
    await assertPdfDownloadQuota(auth.user.id, cacheKey)

    const estado = await iniciaPreparo({
      userId: auth.user.id,
      cacheKey,
      productId: product.id,
      permissionKey: product.permissionKey,
      mediaFileName: product.mediaFileName,
      downloadTitle,
      locale,
      clientIp: clientIp(request),
      userAgent: request.headers.get('user-agent')
    })

    const { token, expiresAt } = await createPdfDownloadToken(
      auth.user.id,
      parsed.data.productId,
      mediaId
    )

    const origin =
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') || request.nextUrl.origin
    const query = `token=${encodeURIComponent(token)}`

    return NextResponse.json(
      {
        downloadUrl: `${origin}/api/library/download/file?${query}`,
        statusUrl: `${origin}/api/library/download/status?${query}`,
        /** `true` = pode baixar agora; `false` = acompanhar por `statusUrl`. */
        pronto: estado === 'pronto',
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000)
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    if (e instanceof PdfDownloadQuotaError) {
      return NextResponse.json(
        { error: 'PDF_DOWNLOAD_QUOTA_EXCEEDED', limit: e.limit },
        { status: 429 }
      )
    }
    if (e instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[library/download/request]', e)
    return NextResponse.json({ error: 'DOWNLOAD_REQUEST_FAILED' }, { status: 500 })
  }
}
