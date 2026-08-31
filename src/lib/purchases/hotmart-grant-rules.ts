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
 *
 * Reconhecer os dois como "livro" não os torna o mesmo produto: quem compra o
 * impresso NÃO ganha o digital. Ver `resolveHotmartGrantProductIds`.
 */
export function isHotmartBookProduct(hotmartProductId: string): boolean {
  const id = hotmartProductId.trim()
  return HOTMART_PHYSICAL_BOOK_IDS.has(id) || HOTMART_DIGITAL_BOOK_IDS.has(id)
}

/**
 * O que a compra do livro impresso libera no app: o PDF bônus, e nada mais.
 *
 * Devolve lista vazia quando o PDF não está cadastrado. Vazia mesmo — cair no
 * grant padrão do catálogo aqui liberaria o digital de novo, calado, e é
 * justamente o que esta regra existe para impedir. Ver `grantPurchaseAccess`,
 * que aceita a compra que não libera nada.
 */
export async function resolvePhysicalBookGrantProductIds(): Promise<string[]> {
  const pdfId = await resolvePdfBonusProductId()
  return pdfId ? [pdfId] : []
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
 * - Livro impresso: só o PDF bônus — o digital é upsell, não vem junto
 * - Livro digital: livro digital + PDF bônus
 * - PDF avulso: só o PDF
 * - Demais (audioterapia, etc.): grants do admin + produto comprado
 */
export async function resolveHotmartGrantProductIds(
  hotmartProductId: string,
  resolvedCatalogProductId: string
): Promise<string[]> {
  const id = hotmartProductId.trim()

  // O impresso e o digital são produtos diferentes, e o digital é um upsell com
  // preço próprio. Dar o digital de brinde para quem comprou o impresso é entregar
  // de graça exatamente o que a oferta seguinte vende — quem quiser ler na tela
  // compra o upsell, e aí chega outro webhook, com o ID do digital, por este mesmo
  // caminho.
  //
  // Os dois IDs continuam apontando para o mesmo produto de catálogo, e isso é
  // proposital: é assim que a venda do impresso é reconhecida, vira despacho e
  // ganha nome na mensagem. O que muda é o que ela LIBERA, e não o que ela é.
  if (HOTMART_PHYSICAL_BOOK_IDS.has(id)) {
    return resolvePhysicalBookGrantProductIds()
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
