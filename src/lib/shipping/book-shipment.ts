import type { BookShipment, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  buildTrackingUrl,
  detectCarrier,
  normalizeTrackingCode
} from '@/lib/shipping/carriers'

export type ShipmentStatus =
  /** Compra registrada, grafica ainda nao postou. */
  | 'aguardando_postagem'
  | 'postado'
  | 'em_transito'
  | 'entregue'
  | 'devolvido'
  | 'problema'

/**
 * Ordem do caminho feliz. Serve para nao deixar uma leitura atrasada da planilha
 * puxar o pedido para tras — o n8n reenvia a mesma linha varias vezes, e um
 * "postado" chegando depois do "entregue" nao pode apagar a entrega.
 *
 * `devolvido` e `problema` ficam de fora de proposito: eles sempre valem, porque
 * sao exatamente a noticia que ninguem pode perder.
 */
const AVANCO: Record<string, number> = {
  aguardando_postagem: 0,
  postado: 1,
  em_transito: 2,
  entregue: 3
}

const SEMPRE_VALEM = new Set(['devolvido', 'problema'])

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'aguardando_postagem',
  'postado',
  'em_transito',
  'entregue',
  'devolvido',
  'problema'
]

export function isShipmentStatus(value: unknown): value is ShipmentStatus {
  return (
    typeof value === 'string' &&
    (SHIPMENT_STATUSES as string[]).includes(value)
  )
}

/**
 * Deduz o status a partir da descricao que a transportadora escreveu.
 *
 * Usado so quando o n8n manda o texto do rastreio sem dizer o status. E melhor
 * acertar a maioria por texto do que deixar tudo parado em `postado` — mas quem
 * souber o status manda ele explicito, que sempre ganha desta heuristica.
 */
export function inferStatusFromLabel(label: string): ShipmentStatus | null {
  const texto = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (/devolv|retorn(o|ado) ao remetente/.test(texto)) return 'devolvido'
  if (/extravi|roubo|avaria|nao foi possivel entregar|endereco incorreto|destinatario ausente|aguardando retirada/.test(texto)) {
    return 'problema'
  }
  if (/entregue|entrega efetuada|entrega realizada/.test(texto)) return 'entregue'
  if (/transito|encaminhado|saiu para entrega|em rota|unidade de tratamento|unidade de distribuicao/.test(texto)) {
    return 'em_transito'
  }
  if (/postado|objeto postado|coletado|expedido/.test(texto)) return 'postado'

  return null
}

export type EnsureShipmentInput = {
  purchaseEventId?: string | null
  userId?: string | null
  email: string
  nome?: string | null
  telefone?: string | null
  provider: string
  externalTransactionId: string
  externalProductId?: string | null
}

/**
 * Registra o livro impresso a despachar.
 *
 * Idempotente na transacao: reentrega do mesmo webhook nao cria um segundo
 * despacho, e nao sobrescreve o que o rastreio ja tiver preenchido.
 *
 * Nunca lanca — o cliente ja pagou e ja tem o acesso digital. Nao registrar o
 * despacho e um problema de visibilidade, e nao pode derrubar a venda.
 */
export async function ensureBookShipment(
  input: EnsureShipmentInput
): Promise<BookShipment | null> {
  try {
    return await prisma.bookShipment.upsert({
      where: {
        provider_externalTransactionId: {
          provider: input.provider,
          externalTransactionId: input.externalTransactionId
        }
      },
      // Reprocessamento so completa o que faltava. Sobrescrever aqui apagaria o
      // contato corrigido na mao pelo atendimento.
      update: {
        userId: input.userId ?? undefined,
        nome: input.nome ?? undefined,
        telefone: input.telefone ?? undefined,
        purchaseEventId: input.purchaseEventId ?? undefined
      },
      create: {
        purchaseEventId: input.purchaseEventId ?? null,
        userId: input.userId ?? null,
        email: normalizeLibraryEmail(input.email),
        nome: input.nome ?? null,
        telefone: input.telefone ?? null,
        provider: input.provider,
        externalTransactionId: input.externalTransactionId,
        externalProductId: input.externalProductId ?? null,
        status: 'aguardando_postagem'
      }
    })
  } catch (error) {
    logger.error(
      'Falha ao registrar despacho do livro impresso',
      error instanceof Error ? error : undefined,
      '[shipping/book-shipment]'
    )
    return null
  }
}

export type TrackingUpdate = {
  trackingCode?: string | null
  status?: ShipmentStatus | null
  statusLabel?: string | null
  events?: unknown
  postedAt?: Date | null
  deliveredAt?: Date | null
}

/**
 * Aplica o que o n8n leu da planilha e da transportadora.
 *
 * A transportadora sai do formato do codigo, e nao do que o n8n informar: quem
 * le a planilha nao sabe quem entrega, e o formato sabe.
 */
export async function applyTrackingUpdate(
  shipment: BookShipment,
  update: TrackingUpdate
): Promise<BookShipment> {
  const data: Prisma.BookShipmentUpdateInput = { lastCheckedAt: new Date() }

  const codigo = update.trackingCode?.trim()
    ? normalizeTrackingCode(update.trackingCode)
    : null

  if (codigo && codigo !== shipment.trackingCode) {
    data.trackingCode = codigo
    data.carrier = detectCarrier(codigo).id
    data.trackingUrl = buildTrackingUrl(codigo)
    // O codigo so existe depois que a grafica postou. Se ninguem disser o
    // status, a chegada do codigo ja e a noticia de que saiu.
    if (!shipment.postedAt) data.postedAt = update.postedAt ?? new Date()
  } else if (update.postedAt && !shipment.postedAt) {
    data.postedAt = update.postedAt
  }

  if (update.statusLabel?.trim()) {
    data.lastStatusLabel = update.statusLabel.trim().slice(0, 255)
  }

  if (update.events !== undefined && update.events !== null) {
    data.events = update.events as Prisma.InputJsonValue
  }

  const novoStatus =
    update.status ??
    (update.statusLabel ? inferStatusFromLabel(update.statusLabel) : null) ??
    (codigo && shipment.status === 'aguardando_postagem' ? 'postado' : null)

  if (novoStatus && podeAvancar(shipment.status, novoStatus)) {
    data.status = novoStatus
    if (novoStatus === 'entregue') {
      data.deliveredAt = update.deliveredAt ?? shipment.deliveredAt ?? new Date()
    }
  } else if (update.deliveredAt && !shipment.deliveredAt) {
    data.deliveredAt = update.deliveredAt
  }

  return prisma.bookShipment.update({
    where: { id: shipment.id },
    data
  })
}

function podeAvancar(atual: string, proximo: string): boolean {
  if (atual === proximo) return false
  if (SEMPRE_VALEM.has(proximo)) return true
  // Sair de devolvido/problema exige noticia melhor de verdade (entregue), e nao
  // uma releitura qualquer da planilha.
  if (SEMPRE_VALEM.has(atual)) return proximo === 'entregue'
  return (AVANCO[proximo] ?? -1) > (AVANCO[atual] ?? -1)
}
