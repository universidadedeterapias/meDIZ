import { NextRequest, NextResponse } from 'next/server'
import { getCurrentLanguage } from '@/i18n/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { serveLibraryContent } from '@/lib/library/serveContent'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/audioterapia' })
  if (auth.ok === false) return auth.response

  const productId = request.nextUrl.searchParams.get('productId')
  let mediaFileName: string | null = null

  if (productId) {
    const product = await prisma.catalogProduct.findUnique({
      where: { id: productId },
      select: { section: true, mediaFileName: true, active: true }
    })

    if (!product || product.section !== 'AUDIOTERAPIA' || !product.active) {
      return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 })
    }

    mediaFileName = product.mediaFileName
  }

  const language = await getCurrentLanguage()
  return serveLibraryContent(auth.user, 'audioterapia', language, {
    mediaFileName,
    productId: productId ?? undefined
  })
}
