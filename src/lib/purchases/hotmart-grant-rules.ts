import { collectProductIdsToGrant } from '@/lib/purchases/resolve-product'
import { resolveCatalogProductByRef } from '@/lib/purchases/resolve-product-ref'

/** Livro físico (BR) — resolve para o mesmo produto de catálogo do digital (O CORPO DIZ). */
export const HOTMART_PHYSICAL_BOOK_IDS = new Set(['6667092'])

/** Livro digital. */
export const HOTMART_DIGITAL_BOOK_IDS = new Set(['6652189', '6649928', '7377949'])

/** PDF avulso — libera só o PDF comprado. */
export const HOTMART_PDF_PRODUCT_IDS = new Set(['5136292', '6294155', '5831214'])

/**
 * Compra de livro (físico ou digital) — o público da esteira de e-mails pós-compra
 * e do trial de 7 dias do Profissional.
 */
export function isHotmartBookProduct(hotmartProductId: string): boolean {
  const id = hotmartProductId.trim()
  return HOTMART_PHYSICAL_BOOK_IDS.has(id) || HOTMART_DIGITAL_BOOK_IDS.has(id)
}

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
 * - Livro (físico ou digital): livro digital + PDF bônus
 * - PDF avulso: só o PDF
 * - Demais (audioterapia, etc.): grants do admin + produto comprado
 */
export async function resolveHotmartGrantProductIds(
  hotmartProductId: string,
  resolvedCatalogProductId: string
): Promise<string[]> {
  const id = hotmartProductId.trim()

  // Físico e digital liberam o mesmo acervo: quem comprou o livro comprou o livro,
  // e a esteira de e-mails pós-compra promete o livro digital aos dois.
  if (HOTMART_PHYSICAL_BOOK_IDS.has(id) || HOTMART_DIGITAL_BOOK_IDS.has(id)) {
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
