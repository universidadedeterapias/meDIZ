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
 *
 * Duas regras decidem quem recebe:
 *
 * 1. So compra do livro, impresso ou digital. Audioterapia avulsa, PDF solto e
 *    assinatura liberam o acesso em silencio — a mensagem inteira fala do livro.
 * 2. Uma por pessoa, para sempre. Nao uma por venda: quem leva o impresso e o
 *    digital no mesmo checkout recebe um aviso, nao dois. O rastreio de cada
 *    exemplar sai depois, pelo fluxo de rastreio, um codigo por despacho.
 *
 * O reenvio pedido no atendimento (`kind: 'access_resent'`) e isento das duas:
 * ele existe justamente para repetir.
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
 * Aviso que nasceu barrado: a pessoa ja tinha recebido o dela.
 *
 * Fica gravado, e nao descartado, porque a pergunta do atendimento e sempre "por
 * que fulano nao recebeu o aviso DESTA compra?" — e a resposta precisa estar em
 * algum lugar. Nunca sai: fica fora da fila de reenvio e ignora reprocessamento.
 */
const STATUS_BARRADO = 'skipped'

/**
 * Onde a pessoa cai ao entrar pelo link: o que ela comprou, nao a home.
 *
 * Quem compra um livro nao quer o chat — quer o livro. Errar isso e o que hoje
 * joga o comprador de biblioteca para dentro dos gates do chat.
 */
async function resolveDestination(
  productIds: string[],
  options: { physicalShipment: boolean }
): Promise<string> {
  // Livro impresso: o exemplar vai pelos Correios e leva dias. O bonus de
  // audioterapia e o que ele consegue usar hoje, entao e para la que o link
  // leva — a biblioteca continua a um clique no menu.
  if (options.physicalShipment) return '/audioterapia'

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

/**
 * O que a pessoa comprou, quando a compra tem despacho.
 *
 * Reserva: hoje quem sabe o nome e o webhook, que passa `mainProductTitle` a
 * partir do produto de catalogo da venda. Esta busca so responde quando ele nao
 * passou — e desde que o impresso deixou de liberar o digital ela nao acha mais
 * nada no caminho do livro, porque a unica coisa liberada por ali e o PDF bonus.
 *
 * Identificado pela `permissionKey`, e nao pela posicao no array:
 * `grantPurchaseAccess` monta `productsGranted` a partir de um `findMany` com
 * `in`, entao a ordem e a que o Postgres devolver.
 */
async function resolveMainProductTitle(
  productIds: string[]
): Promise<string | null> {
  if (productIds.length === 0) return null

  const livro = await prisma.catalogProduct.findFirst({
    where: { id: { in: productIds }, permissionKey: 'LIVRO_DIGITAL' },
    select: { title: true }
  })

  return livro?.title ?? null
}

/**
 * Primeiro acesso e "nunca escolheu a senha", nao "a conta nasceu agora".
 *
 * Quem compra quatro produtos na mesma tarde cria a conta na primeira compra e
 * ja existe nas outras tres. Decidir pelo `userCreated` mandava, nessas tres, o
 * aviso de "entre com o mesmo e-mail e a mesma senha de sempre" — para alguem que
 * nunca definiu senha nenhuma. A pessoa abria o ultimo aviso, caia num login sem
 * chave, e concluia que nao tinha acesso ao que acabara de comprar.
 *
 * `mustResetPassword` e o sinal certo. Nao adianta olhar `passwordHash`: toda
 * conta nasce com uma senha temporaria, entao ele nunca e nulo. A flag so cai
 * quando a pessoa troca a senha de verdade, em `/api/auth/change-password`.
 *
 * Na duvida (usuario sumido), manda link: um link a mais e ruido, um aviso sem
 * credencial e uma porta trancada.
 */
async function resolveKind(
  userId: string,
  userCreated: boolean
): Promise<AccessDeliveryKind> {
  if (userCreated) return 'new_account'

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustResetPassword: true }
  })

  return user && !user.mustResetPassword ? 'products_added' : 'new_account'
}

/**
 * Aviso ja registrado para esta venda, se houver.
 *
 * So faz sentido perguntar quando a venda tem identidade. O reenvio pedido no
 * atendimento nao tem transacao, e deve poder repetir quantas vezes o atendente
 * pedir — e por isso que a trava do banco ignora linha com campo nulo.
 */
async function buscarAvisoDaVenda(
  provider: string | null,
  externalTransactionId: string | null
): Promise<AccessDelivery | null> {
  if (!provider || !externalTransactionId) return null

  return prisma.accessDelivery.findFirst({
    where: { provider, externalTransactionId }
  })
}

/**
 * Conflito de unicidade do Prisma.
 *
 * Conferido pela forma, e nao com `instanceof`, porque `Prisma` entra aqui como
 * import de tipo — trazer o namespace como valor so para isto puxaria o client
 * inteiro para o bundle.
 */
function ehConflitoDeUnicidade(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

/**
 * Grava o aviso, ou devolve o que outro webhook gravou primeiro.
 *
 * A garantia real e o indice unico de `(provider, external_transaction_id)`, e
 * nao a consulta que roda antes: os dois webhooks da mesma compra chegam juntos,
 * os dois consultam antes de qualquer um gravar, e os dois concluem que sao o
 * primeiro. A consulta evita o trabalho; o indice evita a mensagem duplicada.
 */
async function criarAviso(
  data: Prisma.AccessDeliveryUncheckedCreateInput
): Promise<AccessDelivery> {
  try {
    return await prisma.accessDelivery.create({ data })
  } catch (error) {
    if (!ehConflitoDeUnicidade(error)) throw error

    const existente = await buscarAvisoDaVenda(
      data.provider ?? null,
      data.externalTransactionId ?? null
    )
    if (!existente) throw error

    return existente
  }
}

/**
 * Reserva a unica mensagem desta pessoa.
 *
 * `updateMany` com `accessMessageAt: null` no filtro e um teste-e-grava atomico:
 * de dois webhooks que chegam no mesmo instante, o Postgres deixa so um encontrar
 * a coluna vazia. Checar com `findUnique` antes de gravar nao faria isso — os
 * dois leriam null antes de qualquer um escrever, e os dois mandariam.
 *
 * Devolve o instante gravado (para poder desfazer) ou null quando a pessoa ja
 * tinha recebido o aviso dela.
 */
async function reservarMensagem(userId: string): Promise<Date | null> {
  const reservadoEm = new Date()
  const { count } = await prisma.user.updateMany({
    where: { id: userId, accessMessageAt: null },
    data: { accessMessageAt: reservadoEm }
  })
  return count > 0 ? reservadoEm : null
}

/**
 * Devolve a reserva quando o aviso nao chegou a ser gravado.
 *
 * Sem isso, uma falha de banco entre a reserva e o registro deixaria a pessoa
 * marcada como "ja avisada" sem nunca ter recebido nada — e sem linha nenhuma na
 * fila para reenviar. O filtro pelo proprio instante evita apagar a reserva de
 * outro fluxo que tenha gravado no meio.
 */
async function liberarReserva(userId: string, reservadoEm: Date): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: { id: userId, accessMessageAt: reservadoEm },
      data: { accessMessageAt: null }
    })
  } catch (error) {
    logger.error(
      'Falha ao liberar reserva de aviso de acesso',
      error instanceof Error ? error : undefined,
      '[purchases/deliver-access]'
    )
  }
}

function resolveWebhookUrl(): string | null {
  return (
    process.env.N8N_ACCESS_DELIVERY_WEBHOOK_URL?.trim() ||
    process.env.N8N_NEW_USER_WEBHOOK_URL?.trim() ||
    null
  )
}

export type DeliverAccessResult = {
  deliveryId: string | null
  sent: boolean
  /**
   * Por que nao saiu mensagem, quando nao houve falha nenhuma.
   *
   * `nao_e_livro`: a compra nao era do livro — nada a avisar.
   * `ja_avisado`: a pessoa ja tinha recebido a mensagem dela.
   */
  skipped?: 'nao_e_livro' | 'ja_avisado'
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
  /**
   * Nome do que foi comprado, para a mensagem de compra com despacho.
   *
   * E o titulo do produto de catalogo que a venda resolveu — o livro —, e nao um
   * dos produtos liberados: o impresso libera so o PDF bonus, entao a lista de
   * liberados nao tem mais o nome do livro dentro.
   */
  mainProductTitle?: string | null
  purchaseEventId?: string | null
  /**
   * A venda e compra do livro (impresso ou digital).
   *
   * Sem isso nao ha mensagem. Quem sabe responder e quem conhece a origem da
   * venda — o webhook —, entao a decisao chega pronta; aqui so se obedece. Ver
   * `isBookPurchase` em `@/lib/purchases/book-purchase`.
   */
  bookPurchase?: boolean
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
): Promise<DeliverAccessResult> {
  const email = normalizeLibraryEmail(input.email)
  const provider = input.provider?.trim() || null
  const externalTransactionId = input.transactionId?.trim() || null

  // O reenvio do atendimento nao e o aviso da compra: e alguem pedindo segunda
  // via porque nao consegue entrar. Fica fora das duas regras.
  const reenvioManual = input.kind === 'access_resent'
  let reservadoEm: Date | null = null
  let avisoGravado = false

  try {
    // Hotmart e Stone mandam mais de um webhook para a mesma compra. Sair aqui
    // evita gerar um link magico novo — e um registro novo — a cada repeticao.
    const jaExiste = await buscarAvisoDaVenda(provider, externalTransactionId)
    if (jaExiste) {
      if (jaExiste.status === 'sent') {
        return { deliveryId: jaExiste.id, sent: true }
      }

      // Aviso barrado nao vira tentativa: o payload dele nunca foi feito para
      // sair. Reprocessar a venda no admin nao pode transformar isso em mensagem.
      if (jaExiste.status === STATUS_BARRADO) {
        return { deliveryId: jaExiste.id, sent: false, skipped: 'ja_avisado' }
      }

      // O aviso existe mas nao chegou a sair. O webhook repetido, que ate agora
      // so atrapalhava, vira uma tentativa a mais de entregar o que faltou.
      const reenviado = await sendAccessDelivery(jaExiste)
      return { deliveryId: jaExiste.id, sent: reenviado }
    }

    // Compra que nao e do livro libera o acesso e nao fala nada. Nem registro
    // fica: nao ha aviso pendente para o atendimento cobrar, porque nunca houve
    // aviso a fazer.
    if (!reenvioManual && !input.bookPurchase) {
      logger.info(
        `Compra sem aviso: nao e livro (${provider ?? 'sem provedor'}/${externalTransactionId ?? 'sem transacao'})`,
        '[purchases/deliver-access]'
      )
      return { deliveryId: null, sent: false, skipped: 'nao_e_livro' }
    }

    // Trava de uma mensagem por pessoa. Vem antes do link magico de proposito:
    // nao se emite credencial para uma mensagem que ja se sabe que nao vai sair.
    reservadoEm = reenvioManual ? null : await reservarMensagem(input.userId)
    const primeiraMensagem = reenvioManual || reservadoEm !== null

    const kind: AccessDeliveryKind =
      input.kind ?? (await resolveKind(input.userId, input.userCreated))

    const destination =
      input.redirectTo ??
      (await resolveDestination(input.productsGranted.map((p) => p.id), {
        physicalShipment: input.physicalShipment ?? false
      }))

    // So a compra com despacho precisa disso: nas outras, listar tudo que foi
    // liberado e exatamente o que a pessoa quer ler.
    //
    // O impresso nao libera o digital, entao o nome do livro nao esta mais entre
    // os produtos liberados — a unica coisa que sai por ali e o PDF bonus, e uma
    // mensagem anunciando "seu Sentido Biologico esta a caminho" descreveria a
    // compra errada. Por isso o nome vem de quem resolveu a venda.
    const mainProductTitle = input.physicalShipment
      ? input.mainProductTitle?.trim() ||
        (await resolveMainProductTitle(input.productsGranted.map((p) => p.id)))
      : null

    // O link so existe para quem esta entrando pela primeira vez. Quem ja tem
    // conta usa a senha que definiu — mandar link para essa pessoa seria criar
    // uma credencial nova sem motivo. Aviso barrado tambem nao leva link: ele
    // fica gravado so como explicacao, e nunca e entregue.
    const accessLink =
      kind === 'products_added' || !primeiraMensagem
        ? null
        : await createAccessLink(input.userId, { redirectTo: destination })

    const payload = {
      kind,
      email,
      nome: input.nome ?? null,
      telefone: input.telefone ?? null,
      products_granted: input.productsGranted,
      // O nome que vai na mensagem quando ha despacho. Null nas demais compras,
      // e ai quem avisa lista tudo que foi liberado.
      main_product_title: mainProductTitle,
      access_link: accessLink?.url ?? null,
      access_link_expires_at: accessLink?.expiresAt.toISOString() ?? null,
      // Valor do botao de URL do template oficial. A Meta so aceita o sufixo que
      // ela concatena a URL base cadastrada no template (`.../acesso`), nunca a
      // URL inteira — entao ele sai pronto daqui, e o n8n nao precisa fatiar
      // string para descobrir onde a base termina.
      access_link_button_value: accessLink
        ? new URL(accessLink.url).search
        : null,
      // Quem ja tem conta nao recebe link magico, mas precisa de um caminho
      // direto para o que foi liberado — senao cai na home e se perde.
      destination_url: new URL(
        destination,
        process.env.NEXTAUTH_URL?.trim() || 'https://mediz.app'
      ).toString(),
      // O caminho puro, para quem ja tem conta: sem token nao existe botao de
      // link magico, e o n8n precisa do destino para montar a mensagem.
      destination_path: destination,
      transaction_id: input.transactionId ?? null,
      provider: input.provider ?? null,
      external_product_id: input.externalProductId ?? null,
      physical_shipment: input.physicalShipment ?? false,
      shipment_id: input.shipmentId ?? null,
      // So aparece no aviso barrado, e e o que o admin le para entender por que
      // esta compra nao virou mensagem.
      skipped_reason: primeiraMensagem ? null : 'ja_avisado'
    }

    let delivery = await criarAviso({
      userId: input.userId,
      email,
      purchaseEventId: input.purchaseEventId ?? null,
      provider,
      externalTransactionId,
      kind,
      status: primeiraMensagem ? 'pending' : STATUS_BARRADO,
      payload: payload as unknown as Prisma.InputJsonValue
    })
    avisoGravado = true

    // A reserva e nossa, mas outro webhook DESTA MESMA venda gravou um aviso
    // barrado um instante antes — ele perdeu a reserva justamente para nos. A
    // venda so aceita uma linha, entao o caminho e promover a que existe: sem
    // isso sairia o payload dele, que nasceu sem link magico.
    if (primeiraMensagem && delivery.status === STATUS_BARRADO) {
      delivery = await prisma.accessDelivery.update({
        where: { id: delivery.id },
        data: {
          kind,
          status: 'pending',
          payload: payload as unknown as Prisma.InputJsonValue
        }
      })
    }

    // Outro webhook ganhou a corrida e ja entregou: nao manda de novo.
    if (delivery.status === 'sent') {
      return { deliveryId: delivery.id, sent: true }
    }

    // A pessoa ja tinha o aviso dela. O acesso saiu igual, o despacho foi
    // registrado igual — o que nao sai e a segunda mensagem.
    if (!primeiraMensagem) {
      logger.info(
        `Compra sem aviso: pessoa ja avisada (${provider ?? 'sem provedor'}/${externalTransactionId ?? 'sem transacao'})`,
        '[purchases/deliver-access]'
      )
      return { deliveryId: delivery.id, sent: false, skipped: 'ja_avisado' }
    }

    const sent = await sendAccessDelivery(delivery)
    return { deliveryId: delivery.id, sent }
  } catch (error) {
    // A reserva so vale se o aviso chegou a ser gravado. Falhando antes disso,
    // devolve-la e o que mantem a pessoa elegivel ao aviso que ela nao recebeu.
    if (reservadoEm && !avisoGravado) {
      await liberarReserva(input.userId, reservadoEm)
    }

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
