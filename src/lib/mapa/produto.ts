/**
 * O Mapa no checkout Guru.
 *
 * Venda Guru chega como cobranca Stone em /api/stone/webhook, com o id do
 * produto Guru em `stoneProductId`. As cinco ofertas (mapa-p1-2990/1990/1490,
 * mapa-p2-990/490) sao do mesmo produto, entao um id cobre todas; o codigo
 * numerico do produto, que a Stone as vezes manda no lugar, entra por env
 * (STONE_MAPA_PRODUCT_IDS, separado por virgula) assim que a compra teste da
 * Story 7.0 mostrar qual e.
 *
 * Nao e produto de catalogo de proposito: o Mapa nao libera nada da
 * biblioteca, e mapear no catalogo jogaria a venda nas regras de "e livro?".
 */
const MAPA_GURU_PRODUCT_ID = 'a2fa67c6-1258-4c54-94d2-de367ea1f721'

function idsDoAmbiente(): string[] {
  return (process.env.STONE_MAPA_PRODUCT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export function isMapaProduct(
  provider: string | null | undefined,
  externalProductId: string | null | undefined
): boolean {
  const id = externalProductId?.trim()
  if (!id || provider?.trim().toLowerCase() !== 'stone') return false
  return id === MAPA_GURU_PRODUCT_ID || idsDoAmbiente().includes(id)
}

export const MAPA_PRODUCT_TITLE = 'Mapa da Origem Emocional'

/** Checkout da oferta ativa do 1o Mapa. Troca de oferta (teste de preco) e env. */
export function checkoutMapaUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MAPA_CHECKOUT_URL?.trim() ||
    'https://go.ocorpodiz.com.br/pay/mapa-p1-1490'
  )
}

/** Preco exibido junto do botao — acompanha a oferta ativa. */
export function precoMapaExibido(): string {
  return process.env.NEXT_PUBLIC_MAPA_PRECO?.trim() || 'R$ 14,90'
}
