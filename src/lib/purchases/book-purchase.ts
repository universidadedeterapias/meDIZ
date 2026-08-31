import { prisma } from '@/lib/prisma'
import {
  HOTMART_DIGITAL_BOOK_IDS,
  HOTMART_PHYSICAL_BOOK_IDS
} from '@/lib/purchases/hotmart-grant-rules'

/**
 * "Esta venda e compra do livro?" — a pergunta que decide se o cliente recebe
 * mensagem.
 *
 * Existe separado das regras de liberacao porque a resposta precisa valer para
 * qualquer origem. O livro e vendido na Hotmart e tambem no checkout Guru, que
 * cobra pela Stone/pagar.me e chega em `/api/stone/webhook` — os dois vendem o
 * mesmo livro com IDs de produto diferentes.
 */

function idsDoAmbiente(nome: string): string[] {
  return (
    process.env[nome]
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  )
}

/**
 * Livro impresso no checkout Guru (cobranca Stone/pagar.me).
 *
 * Fica em variavel de ambiente, e nao no codigo, porque o ID do impresso na Guru
 * muda quando a oferta e recriada — e trocar isso nao deveria exigir deploy. Sem
 * a variavel a venda continua sendo reconhecida como livro (pelo produto de
 * catalogo, abaixo); o que se perde e so o "tem frete", que muda o texto da
 * mensagem e registra o despacho.
 */
export const STONE_PHYSICAL_BOOK_IDS = new Set(
  idsDoAmbiente('STONE_PHYSICAL_BOOK_PRODUCT_IDS')
)

/** Livro digital no checkout Guru. 1780425821 = EL CUERPO HABLA. */
export const STONE_DIGITAL_BOOK_IDS = new Set([
  '1780425821',
  ...idsDoAmbiente('STONE_DIGITAL_BOOK_PRODUCT_IDS')
])

function idsDoProvedor(
  provider: string | null | undefined
): { fisico: Set<string>; digital: Set<string> } | null {
  switch (provider?.trim().toLowerCase()) {
    case 'hotmart':
      return { fisico: HOTMART_PHYSICAL_BOOK_IDS, digital: HOTMART_DIGITAL_BOOK_IDS }
    case 'stone':
      return { fisico: STONE_PHYSICAL_BOOK_IDS, digital: STONE_DIGITAL_BOOK_IDS }
    default:
      return null
  }
}

/**
 * A venda tem exemplar para despachar.
 *
 * So o ID de origem responde isso: o catalogo mapeia o impresso para o mesmo
 * produto do digital, entao depois de resolver o produto nao ha mais como saber
 * que aquela compra tinha frete.
 */
export function isPhysicalBookProduct(
  provider: string | null | undefined,
  externalProductId: string | null | undefined
): boolean {
  const id = externalProductId?.trim()
  if (!id) return false
  return idsDoProvedor(provider)?.fisico.has(id) ?? false
}

/** Livro reconhecido pelo ID de origem, sem consultar o banco. */
export function isBookExternalId(
  provider: string | null | undefined,
  externalProductId: string | null | undefined
): boolean {
  const id = externalProductId?.trim()
  if (!id) return false
  const ids = idsDoProvedor(provider)
  return !!ids && (ids.fisico.has(id) || ids.digital.has(id))
}

/**
 * Compra do livro, impresso ou digital, venha de onde vier.
 *
 * A lista de IDs cobre o que ja conhecemos; o produto de catalogo cobre o resto.
 * `LIVRO_DIGITAL` e a chave do livro no catalogo, e tanto o impresso quanto o
 * digital resolvem para ela — entao uma oferta nova, de qualquer checkout, passa
 * a ser reconhecida assim que for mapeada no admin, sem mexer em codigo.
 *
 * O PDF bonus e a audioterapia tem chave propria (`PDF`, `AUDIOTERAPIA`) e ficam
 * de fora, que e o ponto: quem compra audioterapia avulsa nao recebe o aviso.
 */
export async function isBookPurchase(input: {
  provider?: string | null
  externalProductId?: string | null
  catalogProductId?: string | null
}): Promise<boolean> {
  if (isBookExternalId(input.provider, input.externalProductId)) return true

  const catalogProductId = input.catalogProductId?.trim()
  if (!catalogProductId) return false

  const livro = await prisma.catalogProduct.findFirst({
    where: { id: catalogProductId, permissionKey: 'LIVRO_DIGITAL' },
    select: { id: true }
  })

  return !!livro
}
