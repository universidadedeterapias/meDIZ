import type { AccessDelivery, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { createAccessLink } from '@/lib/auth/access-link'
import type { GrantedProductSummary } from '@/lib/purchases/grant-purchase'

/**
 * Aviso de acesso ao cliente.
 *
 * Substitui o `notifyN8nNewUser`, que tinha dois problemas: so disparava quando a
 * conta era nova — comprador recorrente nao recebia nada — e mandava a senha em
 * texto no payload. Aqui saem duas mensagens diferentes, e nenhuma leva senha:
 *
 * - `new_account`: primeiro acesso, leva o link magico.
 * - `products_added`: ja tinha conta, leva so o que foi liberado.
 *
 * A entrega em si continua sendo do n8n, que fala com a ChatVolt. O que muda e
 * que agora existe registro do que saiu, e o que falha da para reprocessar.
 */

export type AccessDeliveryKind =
  /** Primeiro acesso: leva link magico. */
  | 'new_account'
  /** Ja tinha conta: leva so o que foi liberado, sem credencial. */
  | 'products_added'
  /** Reenvio pedido no atendimento: leva link, mesmo com senha ja definida. */
  | 'access_resent'

const MAX_ATTEMPTS = 5

/**
 * Onde a pessoa cai ao entrar pelo link: o que ela comprou, nao a home.
 *
 * Quem compra um livro nao quer o chat — quer o livro. Errar isso e o que hoje
 * joga o comprador de biblioteca para dentro dos gates do chat.
 */
async function resolveDestination(
  productIds: string[]
): Promise<string> {
  if (productIds.length === 0) return '/biblioteca'

  const products = await prisma.catalogProduct.findMany({
    where: { id: { in: productIds } },
    select: { permissionKey: true }
  })

  const keys = new Set(products.map((p) => p.permissionKey))

  // Compra mista cai na biblioteca: ela lista tudo, entao ninguem fica sem ver o
  // que comprou.
  if (keys.size > 1) return '/biblioteca'
  if (keys.has('AUDIOTERAPIA')) return '/audioterapia'
  if (keys.has('VIDEO')) return '/cursos'
  return '/biblioteca'
}

function resolveWebhookUrl(): string | null {
  return (
    process.env.N8N_ACCESS_DELIVERY_WEBHOOK_URL?.trim() ||
    process.env.N8N_NEW_USER_WEBHOOK_URL?.trim() ||
    null
  )
}

export type DeliverAccessInput = {
  userId: string
  email: string
  userCreated: boolean
  productsGranted: GrantedProductSummary[]
  nome?: string | null
  telefone?: string | null
  transactionId?: string | null
  provider?: string | null
  /**
   * ID do produto na plataforma de pagamento (nao no catalogo da meDIZ).
   *
   * O n8n usa isso para reconhecer o livro impresso: o catalogo mapeia a compra
   * fisica para o produto digital, entao depois de liberar o acesso nao ha mais
   * como saber que aquela venda tinha frete. So o ID de origem preserva isso.
   */
  externalProductId?: string | null
  /**
   * A compra tem algo para despachar (hoje: o livro impresso).
   *
   * Muda o texto da mensagem — quem comprou o impresso precisa saber que o
   * rastreio vem depois, senao o acesso digital parece ser tudo que comprou.
   * Quem decide e quem conhece a plataforma de origem, nao esta funcao.
   */
  physicalShipment?: boolean
  /**
   * Despacho ja registrado em `book_shipments`.
   *
   * Vai no payload para virar coluna na planilha da grafica. E o que permite ao
   * job que le a planilha devolver o codigo de rastreio apontando para a venda
   * certa - casar por e-mail erra em quem comprou duas vezes.
   */
  shipmentId?: string | null
  purchaseEventId?: string | null
  /** Para onde o link magico leva. Default: resolvido pelo produto liberado. */
  redirectTo?: string
  /** Sobrescreve o tipo inferido de `userCreated` — usado pelo reenvio. */
  kind?: AccessDeliveryKind
}

/**
 * Monta o aviso, registra e tenta entregar.
 *
 * Nunca lanca: o cliente ja pagou e ja tem acesso no banco — falhar o aviso nao
 * pode desfazer isso. O que nao sair fica como `pending`/`failed` para reenvio.
 */
export async function deliverAccess(
  input: DeliverAccessInput
): Promise<{ deliveryId: string | null; sent: boolean }> {
  const email = normalizeLibraryEmail(input.email)
  const kind: AccessDeliveryKind =
    input.kind ?? (input.userCreated ? 'new_account' : 'products_added')

  try {
    const destination =
      input.redirectTo ??
      (await resolveDestination(input.productsGranted.map((p) => p.id)))

    // O link so existe para quem esta entrando pela primeira vez. Quem ja tem
    // conta usa a senha que definiu — mandar link para essa pessoa seria criar
    // uma credencial nova sem motivo.
    const accessLink =
      kind === 'products_added'
        ? null
        : await createAccessLink(input.userId, { redirectTo: destination })

    const payload = {
      kind,
      email,
      nome: input.nome ?? null,
      telefone: input.telefone ?? null,
      products_granted: input.productsGranted,
      access_link: accessLink?.url ?? null,
      access_link_expires_at: accessLink?.expiresAt.toISOString() ?? null,
      // Quem ja tem conta nao recebe link magico, mas precisa de um caminho
      // direto para o que foi liberado — senao cai na home e se perde.
      destination_url: new URL(
        destination,
        process.env.NEXTAUTH_URL?.trim() || 'https://mediz.app'
      ).toString(),
      transaction_id: input.transactionId ?? null,
      provider: input.provider ?? null,
      external_product_id: input.externalProductId ?? null,
      physical_shipment: input.physicalShipment ?? false,
      shipment_id: input.shipmentId ?? null
    }

    const delivery = await prisma.accessDelivery.create({
      data: {
        userId: input.userId,
        email,
        purchaseEventId: input.purchaseEventId ?? null,
        kind,
        status: 'pending',
        payload: payload as unknown as Prisma.InputJsonValue
      }
    })

    const sent = await sendAccessDelivery(delivery)
    return { deliveryId: delivery.id, sent }
  } catch (error) {
    logger.error(
      'Falha ao preparar aviso de acesso',
      error instanceof Error ? error : undefined,
      '[purchases/deliver-access]'
    )
    return { deliveryId: null, sent: false }
  }
}

/**
 * Entrega uma linha ja registrada. Usada tanto no fluxo normal quanto no reenvio,
 * para que os dois caminhos contem tentativa e gravem erro do mesmo jeito.
 */
export async function sendAccessDelivery(
  delivery: AccessDelivery
): Promise<boolean> {
  const url = resolveWebhookUrl()

  if (!url) {
    await markFailed(
      delivery.id,
      delivery.attempts,
      'N8N_ACCESS_DELIVERY_WEBHOOK_URL não configurada'
    )
    logger.warn(
      'Webhook de entrega não configurado — aviso de acesso ficou pendente',
      '[purchases/deliver-access]'
    )
    return false
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(15_000)
    })

    if (!response.ok) {
      await markFailed(
        delivery.id,
        delivery.attempts,
        `n8n respondeu HTTP ${response.status}`
      )
      return false
    }

    await prisma.accessDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'sent',
        attempts: delivery.attempts + 1,
        lastError: null,
        sentAt: new Date()
      }
    })
    return true
  } catch (error) {
    await markFailed(
      delivery.id,
      delivery.attempts,
      error instanceof Error ? error.message : 'Falha de rede'
    )
    return false
  }
}

/**
 * Falha antes do limite fica `pending` (ainda vale reprocessar sozinho); depois do
 * limite vira `failed`, que e o que o admin precisa ver na tela.
 */
async function markFailed(
  id: string,
  attempts: number,
  reason: string
): Promise<void> {
  const nextAttempts = attempts + 1
  try {
    await prisma.accessDelivery.update({
      where: { id },
      data: {
        status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        attempts: nextAttempts,
        lastError: reason.slice(0, 500)
      }
    })
  } catch (error) {
    logger.error(
      'Falha ao registrar erro de entrega',
      error instanceof Error ? error : undefined,
      '[purchases/deliver-access]'
    )
  }
}

/**
 * Reprocessa avisos parados. Chamado pelo endpoint do admin e util para um cron
 * mais adiante — a fila e a propria tabela.
 */
export async function retryPendingDeliveries(
  limit = 25
): Promise<{ tentadas: number; entregues: number }> {
  const pending = await prisma.accessDelivery.findMany({
    where: { status: 'pending', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: Math.min(Math.max(limit, 1), 200)
  })

  let entregues = 0
  for (const delivery of pending) {
    if (await sendAccessDelivery(delivery)) entregues++
  }

  return { tentadas: pending.length, entregues }
}
