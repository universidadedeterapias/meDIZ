import { NextRequest, NextResponse } from 'next/server'
import type { BookShipment } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { isValidCpf } from '@/lib/cpf'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import {
  applyTrackingUpdate,
  isShipmentStatus,
  type ShipmentStatus
} from '@/lib/shipping/book-shipment'
import { normalizeTrackingCode } from '@/lib/shipping/carriers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Entrada do rastreio, alimentada pelo n8n.
 *
 * O job do n8n le a planilha que a grafica preenche e consulta a transportadora;
 * aqui so entra o resultado. O app nao consulta ninguem — ele guarda o estado e
 * mostra, para o admin e para o comprador, a mesma informacao.
 *
 * Aceita uma linha ou um lote: quem le planilha le muitas linhas de uma vez, e
 * uma chamada por linha seria desperdicio.
 *
 * Cada resultado sai com o `row` que entrou, para o n8n escrever a resposta de
 * volta na linha certa da planilha, e com `reason_code` quando nao casa — e o
 * que separa "essa venda o meDIZ nao conhece" de "essa pessoa tem dois livros a
 * caminho e alguem precisa dizer qual e qual".
 *
 * O contrato completo, do lado do n8n, esta em
 * `docs/n8n-rastreio-livro-impresso.md`.
 *
 * A autenticacao aqui e fechada de saida (`validateWebhookBearer`, e nao o
 * `...WhenConfigured`): endpoint novo nao tem venda em producao para proteger,
 * entao nao existe motivo para nascer aberto.
 */

const MAX_LOTE = 200

type LinhaEntrada = {
  /**
   * Devolvido intacto no resultado. E como o n8n sabe em qual linha da planilha
   * escrever a resposta: sem ele, sobra a ordem do array, que casa por acidente
   * e para de casar no dia em que alguem filtrar o lote.
   */
  row?: unknown
  shipment_id?: unknown
  transaction_id?: unknown
  tracking_code?: unknown
  email?: unknown
  cpf?: unknown
  status?: unknown
  status_label?: unknown
  events?: unknown
  posted_at?: unknown
  delivered_at?: unknown
}

type Resultado = {
  ok: boolean
  /** Eco do `row` da entrada, sempre — e por ele que o n8n acha a linha. */
  row?: string
  shipment_id?: string
  status?: string
  /**
   * Por que nao casou, em codigo estavel: o n8n escreve na planilha a partir
   * disto, e texto em portugues muda com o tempo.
   *
   * `nao_encontrado` = nenhuma chave bateu.
   * `ambiguo` = a chave bateu em mais de um despacho esperando codigo, e
   *   escolher no chute gravaria o rastreio no livro errado.
   * `codigo_invalido` = o que veio na coluna do codigo nao e um codigo.
   * `falha` = a atualizacao estourou depois de encontrar o despacho.
   */
  reason_code?: 'nao_encontrado' | 'ambiguo' | 'codigo_invalido' | 'falha'
  /** Preenchido so no erro, para o n8n logar a linha que nao casou. */
  reason?: string
  input?: {
    shipment_id?: string
    transaction_id?: string
    email?: string
    cpf?: string
  }
}

function texto(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function data(value: unknown): Date | null {
  const s = texto(value)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * CPF do jeito que a planilha entrega.
 *
 * Celula numerica come o zero da frente: `01234567890` chega como
 * `1234567890`. Completar de volta e seguro porque quem decide no fim e o
 * digito verificador — numero remendado que nao fecha nao vira consulta.
 *
 * Acima de 11 digitos e CNPJ na coluna errada, e ai nao se corta nada: fatiar
 * nos 11 primeiros produziria um numero do tamanho certo que nunca foi CPF de
 * ninguem, e sairia batendo no cadastro com ele.
 */
function cpfDaPlanilha(value: unknown): string | null {
  const bruto = texto(value)
  if (!bruto) return null

  const digitos = bruto.replace(/\D/g, '')
  if (!digitos || digitos.length > 11) return null

  const cpf = digitos.padStart(11, '0')
  return isValidCpf(cpf) ? cpf : null
}

/**
 * Codigo de rastreio do jeito que a planilha entrega — inclusive quando ela
 * entrega `#N/A ()` ou `CANCELADO`.
 *
 * Sem esta peneira, uma linha dessas que casasse por CPF gravaria a palavra
 * `CANCELADO` como rastreio, e seria isso que o comprador leria na biblioteca.
 *
 * Nao e reconhecer transportadora — transportadora nova tem formato novo, e
 * recusar o desconhecido quebraria o dia em que a grafica trocar de canal. E so
 * recusar o que nao tem como ser codigo: curto demais, ou sem um unico numero.
 */
function codigoDaPlanilha(value: unknown): string | null {
  const bruto = texto(value)
  if (!bruto) return null

  const codigo = normalizeTrackingCode(bruto)
  if (codigo.length < 8) return null
  if (!/^[A-Z0-9]+$/.test(codigo)) return null
  if (!/\d/.test(codigo)) return null
  return codigo
}

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'SHIPMENT_TRACKING_SECRET')
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const linhas = extrairLinhas(body)
  if (linhas === null) {
    return NextResponse.json(
      { error: 'Envie um objeto ou { shipments: [...] }' },
      { status: 400 }
    )
  }
  if (linhas.length === 0) {
    return NextResponse.json({ ok: true, processados: 0, resultados: [] })
  }
  if (linhas.length > MAX_LOTE) {
    return NextResponse.json(
      { error: `Lote acima de ${MAX_LOTE} linhas` },
      { status: 400 }
    )
  }

  const resultados: Resultado[] = []
  for (const linha of linhas) {
    resultados.push(await processarLinha(linha))
  }

  const casaram = resultados.filter((r) => r.ok).length
  return NextResponse.json({
    ok: true,
    processados: resultados.length,
    atualizados: casaram,
    // O que nao casou volta detalhado: linha de planilha que nao encontra o
    // pedido e justamente o caso que alguem precisa olhar.
    nao_encontrados: resultados.length - casaram,
    resultados
  })
}

function extrairLinhas(body: unknown): LinhaEntrada[] | null {
  if (Array.isArray(body)) return body as LinhaEntrada[]
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  if (Array.isArray(record.shipments)) return record.shipments as LinhaEntrada[]
  return [record as LinhaEntrada]
}

async function processarLinha(linha: LinhaEntrada): Promise<Resultado> {
  const row = texto(linha.row)
  const eco = row ? { row } : {}
  const shipmentId = texto(linha.shipment_id)
  const transactionId = texto(linha.transaction_id)
  const email = texto(linha.email)
  const cpf = cpfDaPlanilha(linha.cpf)
  const codigoBruto = texto(linha.tracking_code)
  const codigo = codigoDaPlanilha(linha.tracking_code)

  const entrada = {
    ...(shipmentId ? { shipment_id: shipmentId } : {}),
    ...(transactionId ? { transaction_id: transactionId } : {}),
    ...(email ? { email } : {}),
    ...(cpf ? { cpf } : {})
  }

  // A linha inteira para aqui. Um `CANCELADO` na coluna do codigo nao e ruido a
  // ignorar — e a noticia de que aquele despacho mudou de historia, e quem
  // atualiza a planilha precisa ver isso em vez de um "nao encontrado" morno.
  if (codigoBruto && !codigo) {
    return {
      ok: false,
      ...eco,
      reason_code: 'codigo_invalido',
      reason: `"${codigoBruto}" não é um código de rastreio`,
      input: entrada
    }
  }

  try {
    const { shipment, ambiguo } = await localizar({
      shipmentId,
      transactionId,
      codigo,
      email,
      cpf
    })

    if (!shipment) {
      return {
        ok: false,
        ...eco,
        reason_code: ambiguo ? 'ambiguo' : 'nao_encontrado',
        reason: ambiguo
          ? 'Mais de um despacho esperando código para esta pessoa — resolver no admin'
          : 'Despacho não encontrado',
        input: entrada
      }
    }

    const statusInformado = texto(linha.status)
    const status: ShipmentStatus | null = isShipmentStatus(statusInformado)
      ? statusInformado
      : null

    if (statusInformado && !status) {
      logger.warn(
        `Status "${statusInformado}" desconhecido — caiu na leitura do texto`,
        '[shipments/tracking]'
      )
    }

    const atualizado = await applyTrackingUpdate(shipment, {
      trackingCode: codigo,
      status,
      statusLabel: texto(linha.status_label),
      events: linha.events,
      postedAt: data(linha.posted_at),
      deliveredAt: data(linha.delivered_at)
    })

    return {
      ok: true,
      ...eco,
      shipment_id: atualizado.id,
      status: atualizado.status
    }
  } catch (error) {
    logger.error(
      'Falha ao aplicar rastreio',
      error instanceof Error ? error : undefined,
      '[shipments/tracking]'
    )
    return {
      ok: false,
      ...eco,
      reason_code: 'falha',
      reason: error instanceof Error ? error.message : 'Falha ao aplicar',
      input: entrada
    }
  }
}

/**
 * Acha o despacho, do identificador mais confiavel para o menos.
 *
 * `shipment_id` e o caminho pretendido: ele viaja no aviso de acesso, o n8n grava
 * numa coluna da planilha e devolve. `transaction_id` e o segundo melhor — so
 * existe nas vendas registradas depois que a coluna foi criada na planilha.
 *
 * Depois deles vem o proprio `tracking_code`, que casa o reenvio da mesma linha
 * com o despacho que ja recebeu aquele codigo. Ele fica acima de CPF e e-mail de
 * proposito: e casamento exato, e os dois abaixo sao palpite.
 *
 * CPF cobre o resto (planilha antiga, sem transaction_id): resolve para o usuario
 * pelo CPF gravado no cadastro (preenchido na compra) e dali pega o despacho.
 * So entra quando ha exatamente um despacho esperando codigo, porque quem comprou
 * o livro fisico duas vezes tem dois despachos, e escolher um no chute seria pior
 * do que nao casar.
 *
 * O e-mail e o ultimo recurso, pela mesma razao.
 */
async function localizar(chaves: {
  shipmentId: string | null
  transactionId: string | null
  codigo: string | null
  email: string | null
  cpf: string | null
}): Promise<{ shipment: BookShipment | null; ambiguo: boolean }> {
  if (chaves.shipmentId) {
    const achado = await prisma.bookShipment.findUnique({
      where: { id: chaves.shipmentId }
    })
    return { shipment: achado, ambiguo: false }
  }

  if (chaves.transactionId) {
    const achado = await prisma.bookShipment.findFirst({
      where: { externalTransactionId: chaves.transactionId }
    })
    if (achado) return { shipment: achado, ambiguo: false }
  }

  if (chaves.codigo) {
    const achado = await prisma.bookShipment.findFirst({
      where: { trackingCode: chaves.codigo }
    })
    if (achado) return { shipment: achado, ambiguo: false }
  }

  // Empate nas chaves fracas nao vira erro na hora: o e-mail ainda pode desempatar
  // o que o CPF nao desempatou. Guarda-se a lembranca para o resultado dizer
  // "ambiguo" em vez de "nao encontrado" — sao problemas diferentes, e so um
  // deles se resolve na mao.
  let ambiguo = false

  // Chega aqui com 11 digitos e digito verificador conferido: quem peneira e o
  // `cpfDaPlanilha`, na entrada.
  if (chaves.cpf) {
    const usuario = await prisma.user.findFirst({
      where: { cpf: chaves.cpf },
      select: { id: true }
    })
    if (usuario) {
      const candidatos = await esperandoCodigo({ userId: usuario.id })
      if (candidatos.length === 1) return { shipment: candidatos[0], ambiguo: false }
      if (candidatos.length > 1) ambiguo = true
    }
  }

  if (chaves.email) {
    const candidatos = await esperandoCodigo({
      email: normalizeLibraryEmail(chaves.email)
    })
    if (candidatos.length === 1) return { shipment: candidatos[0], ambiguo: false }
    if (candidatos.length > 1) ambiguo = true
  }

  return { shipment: null, ambiguo }
}

/**
 * Despachos da pessoa que ainda esperam codigo.
 *
 * Traz dois e para: quem chama so precisa saber se ha exatamente um. Contar a
 * lista inteira seria trabalho para uma resposta que nao muda.
 */
function esperandoCodigo(quem: { userId: string } | { email: string }) {
  return prisma.bookShipment.findMany({
    where: { ...quem, status: 'aguardando_postagem' },
    orderBy: { createdAt: 'desc' },
    take: 2
  })
}
