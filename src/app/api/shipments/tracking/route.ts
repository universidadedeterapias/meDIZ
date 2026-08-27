import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { normalizeCpf } from '@/lib/cpf'
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
 * A autenticacao aqui e fechada de saida (`validateWebhookBearer`, e nao o
 * `...WhenConfigured`): endpoint novo nao tem venda em producao para proteger,
 * entao nao existe motivo para nascer aberto.
 */

const MAX_LOTE = 200

type LinhaEntrada = {
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
  shipment_id?: string
  status?: string
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
  const shipmentId = texto(linha.shipment_id)
  const transactionId = texto(linha.transaction_id)
  const email = texto(linha.email)
  const cpfBruto = texto(linha.cpf)
  const cpf = cpfBruto ? normalizeCpf(cpfBruto) : null
  const codigoBruto = texto(linha.tracking_code)
  const codigo = codigoBruto ? normalizeTrackingCode(codigoBruto) : null

  const entrada = {
    ...(shipmentId ? { shipment_id: shipmentId } : {}),
    ...(transactionId ? { transaction_id: transactionId } : {}),
    ...(email ? { email } : {}),
    ...(cpf ? { cpf } : {})
  }

  try {
    const shipment = await localizar({
      shipmentId,
      transactionId,
      codigo,
      email,
      cpf
    })

    if (!shipment) {
      return {
        ok: false,
        reason: 'Despacho não encontrado',
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

    return { ok: true, shipment_id: atualizado.id, status: atualizado.status }
  } catch (error) {
    logger.error(
      'Falha ao aplicar rastreio',
      error instanceof Error ? error : undefined,
      '[shipments/tracking]'
    )
    return {
      ok: false,
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
}) {
  if (chaves.shipmentId) {
    return prisma.bookShipment.findUnique({ where: { id: chaves.shipmentId } })
  }

  if (chaves.transactionId) {
    const achado = await prisma.bookShipment.findFirst({
      where: { externalTransactionId: chaves.transactionId }
    })
    if (achado) return achado
  }

  if (chaves.codigo) {
    const achado = await prisma.bookShipment.findFirst({
      where: { trackingCode: chaves.codigo }
    })
    if (achado) return achado
  }

  if (chaves.cpf && chaves.cpf.length === 11) {
    const usuario = await prisma.user.findFirst({
      where: { cpf: chaves.cpf },
      select: { id: true }
    })
    if (usuario) {
      const candidatos = await prisma.bookShipment.findMany({
        where: { userId: usuario.id, status: 'aguardando_postagem' },
        orderBy: { createdAt: 'desc' },
        take: 2
      })
      if (candidatos.length === 1) return candidatos[0]
    }
  }

  if (chaves.email) {
    const candidatos = await prisma.bookShipment.findMany({
      where: {
        email: normalizeLibraryEmail(chaves.email),
        status: 'aguardando_postagem'
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    })
    if (candidatos.length === 1) return candidatos[0]
  }

  return null
}
