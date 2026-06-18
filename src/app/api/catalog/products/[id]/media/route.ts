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
  productMatchesUserLanguage,
  languageToCatalogLocale
} from '@/lib/catalog/locale'
import { resolveLibraryLocale } from '@/lib/library/locale'
import { serveLibraryContent } from '@/lib/library/serveContent'
import { protectMediaPayload } from '@/lib/library/protect-media-url'
import { getProductEntitlementIdsForUser } from '@/lib/purchases/entitlements'
import {
  ensureCourseModulesMigrated,
  buildCourseModulePlayback,
  firstModuleVideo,
  firstModulePdf
} from '@/lib/catalog/course-modules'
import {
  listCourseMaterials,
  pickCourseMedia
} from '@/lib/catalog/course-media'
import type { CourseMediaKind } from '@/lib/catalog/types'
import { requireUser } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireUser({ pathname: '/api/catalog/products/media' })
  if (auth.ok === false) return auth.response

  const { id } = await context.params
  const indexParam = request.nextUrl.searchParams.get('index')
  const kindParam = request.nextUrl.searchParams.get('kind')
  const listAll = request.nextUrl.searchParams.get('list') === '1'

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
      freeAccess: true,
      paymentProvider: true
    }
  })

  if (!product || !product.active) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 })
  }

  const isFree = isFreeCatalogProduct(product)
  const contentKey = permissionKeyToLib(product.permissionKey)

  if (!isFree) {
    const entitled = await getProductEntitlementIdsForUser(auth.user)
    if (entitled.has(id)) {
      // entitlement granular — ok
    } else if (product.permissionKey === 'VIDEO' || product.paymentProvider === 'STONE') {
      return NextResponse.json(
        { error: 'NO_PERMISSION_FOR_THIS_CONTENT' },
        { status: 403 }
      )
    } else {
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

  const resolveMediaRef = (
    mediaRef: string,
    mediaKind?: 'video' | 'pdf'
  ): NextResponse | null => {
    if (!mediaRef?.trim()) return null
    const resolved = resolveProductMediaUrl(
      product.permissionKey,
      mediaRef,
      locale,
      baseUrl
    )
    if (!resolved) return null
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

  if (product.permissionKey === 'VIDEO') {
    const fullProduct = await prisma.catalogProduct.findUnique({ where: { id } })
    const moduleDtos = fullProduct
      ? await ensureCourseModulesMigrated(fullProduct)
      : []

    const resolveCourseUrl = (
      mediaRef: string,
      kind: CourseMediaKind
    ): string | null => {
      const permission =
        kind === 'pdf' ? 'PDF' : kind === 'audio' ? 'AUDIOTERAPIA' : 'VIDEO'
      return (
        resolveProductMediaUrl(permission, mediaRef, locale, baseUrl)?.url ??
        null
      )
    }

    const playback = buildCourseModulePlayback(
      moduleDtos,
      languageToCatalogLocale(language),
      resolveCourseUrl
    )

    if (listAll) {
      const legacyMaterials = listCourseMaterials(
        allItems,
        language,
        product.mediaFileName
      )
      const legacyVideo = legacyMaterials.video
        ? resolveProductMediaUrl(
            'VIDEO',
            legacyMaterials.video.mediaFileName,
            locale,
            baseUrl
          )
        : null
      const legacyPdf = legacyMaterials.pdf
        ? resolveProductMediaUrl(
            'PDF',
            legacyMaterials.pdf.mediaFileName,
            locale,
            baseUrl
          )
        : null

      const videoFromModules = firstModuleVideo(playback)
      const pdfFromModules = firstModulePdf(playback)

      return NextResponse.json(
        {
          locale,
          modules: playback.map((mod) => ({
            id: mod.id,
            title: mod.title,
            description: mod.description,
            coverImageUrl: mod.coverImageUrl,
            sortOrder: mod.sortOrder,
            media: mod.media
          })),
          video: videoFromModules ??
            (legacyVideo
              ? { url: legacyVideo.url, title: legacyMaterials.video?.title }
              : null),
          pdf: pdfFromModules ??
            (legacyPdf
              ? { url: legacyPdf.url, title: legacyMaterials.pdf?.title }
              : null)
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const moduleId = request.nextUrl.searchParams.get('moduleId')
    const mediaId = request.nextUrl.searchParams.get('mediaId')
    const courseKind: CourseMediaKind =
      kindParam === 'pdf' ? 'pdf' : kindParam === 'audio' ? 'audio' : 'video'
    const mediaListKey =
      courseKind === 'video' ? 'videos' : courseKind === 'pdf' ? 'pdfs' : 'audios'

    const pickFromModule = (mod: (typeof playback)[number]) => {
      const list = mod.media[mediaListKey]
      if (mediaId) return list.find((m) => m.id === mediaId) ?? null
      return list[0] ?? null
    }

    if (moduleId && playback.length > 0) {
      const mod = playback.find((m) => m.id === moduleId)
      const picked = mod ? pickFromModule(mod) : null
      if (picked?.url) {
        const response = resolveMediaRef(
          picked.url,
          courseKind === 'pdf' ? 'pdf' : courseKind === 'video' ? 'video' : undefined
        )
        if (response) return response
      }
    }

    for (const mod of playback) {
      const picked = pickFromModule(mod)
      if (picked?.url) {
        const response = resolveMediaRef(
          picked.url,
          courseKind === 'pdf' ? 'pdf' : courseKind === 'video' ? 'video' : undefined
        )
        if (response) return response
      }
    }

    const picked = pickCourseMedia(
      allItems,
      language,
      courseKind === 'audio' ? 'video' : courseKind,
      product.mediaFileName
    )
    if (picked) {
      const response = resolveMediaRef(
        picked.mediaFileName,
        courseKind === 'pdf' ? 'pdf' : 'video'
      )
      if (response) return response
    }

    return NextResponse.json(
      { error: 'CONTENT_NOT_AVAILABLE', locale },
      { status: 404 }
    )
  }

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
    const response = resolveMediaRef(mediaRef, undefined)
    if (response) return response
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
