import { collectProductIdsToGrant } from '@/lib/purchases/resolve-product'
import { resolveCatalogProductByRef } from '@/lib/purchases/resolve-product-ref'

/** Livro físico (BR) — libera só o PDF bônus; livro digital só via order bump (ID digital). */
export const HOTMART_PHYSICAL_BOOK_IDS = new Set(['6667092'])

/** Livro digital — libera o livro + PDF bônus. */
export const HOTMART_DIGITAL_BOOK_IDS = new Set(['6652189', '6649928', '7377949'])

/** PDF avulso — libera só o PDF comprado. */
export const HOTMART_PDF_PRODUCT_IDS = new Set(['5136292', '6294155', '5831214'])

async function resolvePdfBonusProductId(): Promise<string | null> {
  const pdf = await resolveCatalogProductByRef({
    section: 'BIBLIOTECA',
    permissionKey: 'PDF',
    locale: 'pt',
    titleIncludes: 'Sentido Biológico'
  })
  return pdf?.id ?? null
}

/**
 * Define quais produtos do catálogo recebem entitlement conforme o ID Hotmart.
 *
 * - Físico (6667092): só PDF bônus
 * - Digital (6652189, …): livro digital + PDF bônus
 * - PDF avulso: só o PDF
 * - Demais (audioterapia, etc.): grants do admin + produto comprado
 */
export async function resolveHotmartGrantProductIds(
  hotmartProductId: string,
  resolvedCatalogProductId: string
): Promise<string[]> {
  const id = hotmartProductId.trim()

  if (HOTMART_PHYSICAL_BOOK_IDS.has(id)) {
    const pdfId = await resolvePdfBonusProductId()
    return pdfId ? [pdfId] : []
  }

  if (HOTMART_DIGITAL_BOOK_IDS.has(id)) {
    const pdfId = await resolvePdfBonusProductId()
    const ids = new Set<string>([resolvedCatalogProductId])
    if (pdfId) ids.add(pdfId)
    return [...ids]
  }

  if (HOTMART_PDF_PRODUCT_IDS.has(id)) {
    return [resolvedCatalogProductId]
  }

  return collectProductIdsToGrant(resolvedCatalogProductId)
}
