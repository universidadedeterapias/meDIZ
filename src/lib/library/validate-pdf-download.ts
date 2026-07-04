import { prisma } from '@/lib/prisma'
import { getCurrentLanguage } from '@/i18n/server'
import { productMatchesUserLanguage } from '@/lib/catalog/locale'
import { isFreeCatalogProduct } from '@/lib/catalog/freeProducts'
import { permissionKeyToLib } from '@/lib/catalog/types'
import { parseMediaItems } from '@/lib/catalog/media-items'
import { pickCourseMedia } from '@/lib/catalog/course-media'
import { userHasProductEntitlement } from '@/lib/purchases/entitlements'
import {
  assertLibraryContentAccess,
  LibraryAccessError,
  type LibraryAuthIdentity
} from '@/lib/library/permissions'
import { resolveLibraryLocale } from '@/lib/library/locale'
import type { LanguageCode } from '@/i18n/config'

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

export async function getPdfProductForDownload(
  productId: string,
  user: LibraryAuthIdentity,
  languageOverride?: LanguageCode
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

  const language = languageOverride ?? await getCurrentLanguage()
  if (!productMatchesUserLanguage(product.locale, language)) {
    throw new PdfDownloadAccessError('PRODUCT_NOT_FOUND', 404)
  }

  let effectiveMediaFileName = product.mediaFileName

  if (product.permissionKey === 'VIDEO' || product.paymentProvider === 'STONE') {
    if (!isFreeCatalogProduct(product)) {
      await assertProductAccess(user, product.id)
    }

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
    locale
  }
}
