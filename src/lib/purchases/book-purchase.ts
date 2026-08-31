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
 * Livro impresso no checkout Guru (Digital Manager Guru, cobrado pela Stone).
 *
 * Os dois valores sao a mesma oferta: o UUID e o `metadata.product_id`, que o
 * `extractStoneProductId` prefere, e o numerico e o `items[].code`, que ele usa
 * quando o metadata nao vem. Cobrir os dois evita o mesmo defeito voltar pela
 * outra porta.
 *
 * Fixo no codigo, e nao so em env, pelo mesmo motivo dos IDs da Hotmart: valor
 * que precisa ser configurado e valor que alguem esquece. E o custo do esquecimento
 * aqui e caro — sem ser reconhecida como impressa, a venda cai na regra do digital
 * e libera de graca justamente o upsell, alem de nao virar despacho. Foi o que
 * aconteceu com as seis primeiras vendas do impresso pelo Guru.
 *
 * O env continua valendo, somado, para uma oferta nova entrar sem deploy.
 */
export const STONE_PHYSICAL_BOOK_IDS = new Set([
  'a1efe6c8-b98d-4d9e-9e22-4cab1e780424',
  '1780515697',
  ...idsDoAmbiente('STONE_PHYSICAL_BOOK_PRODUCT_IDS')
])

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
