import type { LibraryPermissoes } from '@/lib/library/permissions'

const EMPTY: LibraryPermissoes = {
  audioterapia: false,
  pdf: false,
  livro_digital: false
}

function parseList(envVar: string | undefined): Set<string> {
  if (!envVar?.trim()) return new Set()
  return new Set(
    envVar
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

function parseOfferCodes(envVar: string | undefined): Set<string> {
  const set = parseList(envVar)
  return new Set([...set].map((code) => code.toLowerCase()))
}

/**
 * Mapeia product.id e/ou offer.code da Hotmart → permissões da biblioteca.
 * Configure via env (IDs e códigos separados por vírgula).
 */
export function resolveLibraryPermissionsFromHotmart(
  productId: string,
  offerCode?: string | null
): LibraryPermissoes | null {
  const id = productId.trim()
  const code = offerCode?.trim().toLowerCase() ?? ''

  const bundleIds = parseList(process.env.HOTMART_LIBRARY_BUNDLE_PRODUCT_IDS)
  const bundleCodes = parseOfferCodes(
    process.env.HOTMART_LIBRARY_BUNDLE_OFFER_CODES
  )

  if (bundleIds.has(id) || (code && bundleCodes.has(code))) {
    return {
      audioterapia: true,
      pdf: true,
      livro_digital: true
    }
  }

  const perms: LibraryPermissoes = { ...EMPTY }
  let matched = false

  const audioterapiaIds = parseList(
    process.env.HOTMART_LIBRARY_AUDIOTERAPIA_PRODUCT_IDS
  )
  const pdfIds = parseList(process.env.HOTMART_LIBRARY_PDF_PRODUCT_IDS)
  const livroIds = parseList(process.env.HOTMART_LIBRARY_LIVRO_PRODUCT_IDS)

  const audioterapiaCodes = parseOfferCodes(
    process.env.HOTMART_LIBRARY_AUDIOTERAPIA_OFFER_CODES
  )
  const pdfCodes = parseOfferCodes(process.env.HOTMART_LIBRARY_PDF_OFFER_CODES)
  const livroCodes = parseOfferCodes(
    process.env.HOTMART_LIBRARY_LIVRO_OFFER_CODES
  )

  if (audioterapiaIds.has(id) || (code && audioterapiaCodes.has(code))) {
    perms.audioterapia = true
    matched = true
  }
  if (pdfIds.has(id) || (code && pdfCodes.has(code))) {
    perms.pdf = true
    matched = true
  }
  if (livroIds.has(id) || (code && livroCodes.has(code))) {
    perms.livro_digital = true
    matched = true
  }

  return matched ? perms : null
}

export function isMedizSubscriptionProduct(productId: string): boolean {
  const medizId = process.env.HOTMART_MEDIZ_PRODUCT_ID?.trim()
  return !!medizId && productId.trim() === medizId
}
