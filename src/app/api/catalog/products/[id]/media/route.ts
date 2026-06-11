import { NextRequest, NextResponse } from 'next/server'
import { getCurrentLanguage } from '@/i18n/server'
import { prisma } from '@/lib/prisma'
import { parseMediaItems } from '@/lib/catalog/media-items'
import { resolveProductMediaUrl } from '@/lib/catalog/resolveProductMedia'
import { isFreeCatalogProduct } from '@/lib/catalog/freeProducts'
import { permissionKeyToLib } from '@/lib/catalog/types'
import {
  assertLibraryContentAccess,
  LibraryAccessError
} from '@/lib/library/permissions'
import {
  filterMediaItemsForUserLanguage,
  productMatchesUserLanguage
} from '@/lib/catalog/locale'
import { resolveLibraryLocale } from '@/lib/library/locale'
import { serveLibraryContent } from '@/lib/library/serveContent'
import { protectMediaPayload } from '@/lib/library/protect-media-url'
import { requireUser } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireUser({ pathname: '/api/catalog/products/media' })
  if (auth.ok === false) return auth.response

  const { id } = await context.params
  const indexParam = request.nextUrl.searchParams.get('index')

  const product = await prisma.catalogProduct.findUnique({
    where: { id },
    select: {
      active: true,
      title: true,
      section: true,
      permissionKey: true,
      locale: true,
      mediaFileName: true,
      mediaItems: true,
      pdfIndex: true,
      freeAccess: true
    }
  })

  if (!product || !product.active) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 })
  }

  const isFree = isFreeCatalogProduct(product)
  const contentKey = permissionKeyToLib(product.permissionKey)

  if (!isFree) {
    try {
      await assertLibraryContentAccess(auth.user, contentKey)
    } catch (e) {
      if (e instanceof LibraryAccessError) {
        return NextResponse.json(
          { error: 'NO_PERMISSION_FOR_THIS_CONTENT' },
          { status: 403 }
        )
      }
      throw e
    }
  }

  const language = await getCurrentLanguage()
  if (!productMatchesUserLanguage(product.locale, language)) {
    return NextResponse.json({ error: 'CONTENT_NOT_AVAILABLE' }, { status: 404 })
  }

  const locale = resolveLibraryLocale(language)
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.PUBLIC_APP_URL || process.env.NEXTAUTH_URL || undefined
      : undefined

  const allItems = parseMediaItems(product.mediaItems)
  const items = allItems
    ? filterMediaItemsForUserLanguage(allItems, language)
    : null
  let mediaRef = product.mediaFileName

  if (indexParam !== null && items?.length) {
    const idx = Number.parseInt(indexParam, 10)
    if (!Number.isNaN(idx)) {
      const track =
        items.find((item) => item.sortOrder === idx) ?? items[idx]
      if (track) mediaRef = track.mediaFileName
    }
  }

  if (mediaRef?.trim()) {
    const resolved = resolveProductMediaUrl(
      product.permissionKey,
      mediaRef,
      locale,
      baseUrl
    )
    if (resolved) {
      const mediaKind =
        product.permissionKey === 'VIDEO' ? 'video' : undefined
      const body = protectMediaPayload(
        {
          url: resolved.url,
          locale: resolved.locale,
          ...(mediaKind ? { mediaKind } : {})
        },
        auth.user.id,
        {
          productId: id,
          permission: permissionKeyToLib(product.permissionKey),
          freeAccess: isFree
        }
      )
      return NextResponse.json(body, {
        headers: { 'Cache-Control': 'no-store' }
      })
    }
  }

  if (product.permissionKey === 'AUDIOTERAPIA') {
    return serveLibraryContent(auth.user, 'audioterapia', language, {
      mediaFileName: product.mediaFileName,
      skipPermissionCheck: isFree,
      productId: id,
      freeAccess: isFree
    })
  }

  if (product.permissionKey === 'LIVRO_DIGITAL') {
    return serveLibraryContent(auth.user, 'livro_digital', language, {
      productId: id,
      freeAccess: isFree
    })
  }

  if (product.permissionKey === 'PDF') {
    const legacy = await serveLibraryContent(auth.user, 'pdf', language, {
      productId: id,
      freeAccess: isFree
    })
    const legacyJson = await legacy.json()
    if (legacy.ok && Array.isArray(legacyJson.urls) && legacyJson.urls.length > 0) {
      const target =
        legacyJson.urls[product.pdfIndex] ??
        legacyJson.urls[0]
      if (target?.url) {
        return NextResponse.json(
          {
            url: target.url,
            label: target.label,
            locale: legacyJson.locale
          },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      }
    }
    return legacy
  }

  return NextResponse.json(
    { error: 'CONTENT_NOT_AVAILABLE', locale },
    { status: 404 }
  )
}
