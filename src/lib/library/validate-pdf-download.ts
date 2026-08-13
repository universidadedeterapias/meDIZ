import { prisma } from '@/lib/prisma'
import { getCurrentLanguage } from '@/i18n/server'
import type { LanguageCode } from '@/i18n/config'
import { productMatchesUserLanguage } from '@/lib/catalog/locale'
import { isFreeCatalogProduct } from '@/lib/catalog/freeProducts'
import { permissionKeyToLib } from '@/lib/catalog/types'
import { parseMediaItems } from '@/lib/catalog/media-items'
import { pickCourseMedia } from '@/lib/catalog/course-media'
import { ensureCourseModulesMigrated } from '@/lib/catalog/course-modules'
import { languageToCatalogLocale } from '@/lib/catalog/locale'
import { userHasProductEntitlement } from '@/lib/purchases/entitlements'
import {
  assertLibraryContentAccess,
  LibraryAccessError,
  type LibraryAuthIdentity
} from '@/lib/library/permissions'
import { resolveLibraryLocale } from '@/lib/library/locale'

export class PdfDownloadAccessError extends Error {
  readonly status: number
  constructor(message: string, status = 403) {
    super(message)
    this.name = 'PdfDownloadAccessError'
    this.status = status
  }
}

async function assertProductAccess(
  user: LibraryAuthIdentity,
  productId: string
): Promise<void> {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true }
  })
  const email = dbUser?.email ?? user.email
  const entitled = await userHasProductEntitlement(email, productId)
  if (!entitled) {
    throw new PdfDownloadAccessError('NO_PERMISSION_FOR_THIS_CONTENT', 403)
  }
}

type ResolvedCoursePdf = {
  mediaFileName: string
  title: string
  mediaId: string
}

/**
 * Cursos guardam a mídia em `CatalogCourseModule`/`CatalogModuleMedia` — a mesma
 * fonte que o leitor consome via `/api/catalog/products/[id]/media`. A coluna
 * legada `mediaItems` fica nula nos cursos criados pelo admin novo, então
 * resolver o download só por ela devolvia 404 mesmo com o PDF visível na tela.
 */
export async function resolveCoursePdfFromModules(
  productId: string,
  language: LanguageCode,
  mediaId: string | null | undefined
): Promise<ResolvedCoursePdf | null> {
  const fullProduct = await prisma.catalogProduct.findUnique({
    where: { id: productId }
  })
  if (!fullProduct) return null

  const modules = await ensureCourseModulesMigrated(fullProduct)
  const pdfs = modules
    .flatMap((mod) => mod.media)
    .filter((media) => media.kind === 'pdf' && media.mediaFileName.trim())

  if (pdfs.length === 0) return null

  const toResolved = (media: (typeof pdfs)[number]): ResolvedCoursePdf => ({
    mediaFileName: media.mediaFileName.trim(),
    title: media.title,
    mediaId: media.id
  })

  // Mídia explícita: o leitor já sabe qual PDF está aberto, então não refiltra
  // por idioma aqui — o item veio de uma listagem que já passou por esse filtro.
  if (mediaId?.trim()) {
    const exact = pdfs.find((media) => media.id === mediaId.trim())
    return exact ? toResolved(exact) : null
  }

  const contentLocale = languageToCatalogLocale(language)
  const localized = pdfs.find(
    (media) => media.locale === null || media.locale === contentLocale
  )
  return toResolved(localized ?? pdfs[0])
}

export async function getPdfProductForDownload(
  productId: string,
  user: LibraryAuthIdentity,
  options?: { mediaId?: string | null }
) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      active: true,
      title: true,
      permissionKey: true,
      locale: true,
      mediaFileName: true,
      mediaItems: true,
      freeAccess: true,
      paymentProvider: true
    }
  })

  if (!product?.active) {
    throw new PdfDownloadAccessError('PRODUCT_NOT_FOUND', 404)
  }

  const language = await getCurrentLanguage()
  if (!productMatchesUserLanguage(product.locale, language)) {
    throw new PdfDownloadAccessError('PRODUCT_NOT_FOUND', 404)
  }

  let effectiveMediaFileName = product.mediaFileName
  // Título do arquivo entregue: para curso é o do material específico, não o do
  // produto — senão os 4 PDFs baixariam com o mesmo nome.
  let downloadTitle = product.title
  let resolvedMediaId: string | null = null

  if (product.permissionKey === 'VIDEO' || product.paymentProvider === 'STONE') {
    if (!isFreeCatalogProduct(product)) {
      await assertProductAccess(user, product.id)
    }

    const fromModules = await resolveCoursePdfFromModules(
      product.id,
      language,
      options?.mediaId
    )

    if (fromModules) {
      effectiveMediaFileName = fromModules.mediaFileName
      downloadTitle = fromModules.title
      resolvedMediaId = fromModules.mediaId
    } else if (options?.mediaId?.trim()) {
      // Pediram um material que não existe mais (ou não é PDF) neste curso.
      throw new PdfDownloadAccessError('PDF_MEDIA_NOT_FOUND', 404)
    } else {
      const pdfItem = pickCourseMedia(
        parseMediaItems(product.mediaItems),
        language,
        'pdf',
        null
      )
      if (!pdfItem?.mediaFileName?.trim()) {
        throw new PdfDownloadAccessError('PDF_SOURCE_NOT_CONFIGURED', 404)
      }
      effectiveMediaFileName = pdfItem.mediaFileName
      downloadTitle = pdfItem.title || product.title
    }
  } else if (
    product.permissionKey === 'PDF' ||
    product.permissionKey === 'LIVRO_DIGITAL'
  ) {
    const entitled = await userHasProductEntitlement(
      (await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true }
      }))?.email ?? user.email,
      product.id
    )

    if (!isFreeCatalogProduct(product) && !entitled) {
      const contentKey = permissionKeyToLib(product.permissionKey)
      try {
        await assertLibraryContentAccess(user, contentKey)
      } catch (e) {
        if (e instanceof LibraryAccessError) {
          throw new PdfDownloadAccessError('NO_PERMISSION_FOR_THIS_CONTENT', 403)
        }
        throw e
      }
    }

    if (!effectiveMediaFileName?.trim()) {
      throw new PdfDownloadAccessError('PDF_SOURCE_NOT_CONFIGURED', 404)
    }
  } else {
    throw new PdfDownloadAccessError('DOWNLOAD_NOT_AVAILABLE_FOR_TYPE', 400)
  }

  const locale = resolveLibraryLocale(language)
  return {
    product: { ...product, mediaFileName: effectiveMediaFileName },
    downloadTitle,
    mediaId: resolvedMediaId,
    locale
  }
}
