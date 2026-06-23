import { isValidCpf, normalizeCpf } from '@/lib/cpf'

export type StoneWebhookPurchase = {
  eventType: string
  transactionId: string
  email: string
  nome: string | null
  cpf: string | null
  stoneProductId: string | null
  catalogProductId: string | null
}

function dig(
  obj: unknown,
  ...paths: string[]
): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  const record = obj as Record<string, unknown>
  for (const path of paths) {
    const parts = path.split('.')
    let cur: unknown = record
    for (const part of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as Record<string, unknown>)[part]
    }
    if (cur != null && cur !== '') return cur
  }
  return undefined
}

function asString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function extractEmail(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const customer = data.customer as Record<string, unknown> | undefined
  const order = data.order as Record<string, unknown> | undefined
  const charge = data.charge as Record<string, unknown> | undefined

  return (
    asString(dig(customer, 'email')) ||
    asString(dig(order, 'customer.email')) ||
    asString(dig(charge, 'customer.email')) ||
    asString(dig(data, 'customer.email')) ||
    asString(dig(payload, 'customer.email'))
  )
}

function extractName(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const customer = data.customer as Record<string, unknown> | undefined
  return (
    asString(dig(customer, 'name')) ||
    asString(dig(data, 'customer.name')) ||
    asString(dig(payload, 'customer.name'))
  )
}

function extractCpf(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const customer = data.customer as Record<string, unknown> | undefined
  const document = asString(
    dig(customer, 'document') ||
      dig(customer, 'document_number') ||
      dig(data, 'customer.document')
  )
  if (!document) return null
  const digits = normalizeCpf(document)
  return digits.length === 11 && isValidCpf(digits) ? digits : null
}

function extractStoneProductId(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const metadata = (data.metadata ?? payload.metadata) as
    | Record<string, unknown>
    | undefined

  const fromMeta =
    asString(dig(metadata, 'stone_product_id')) ||
    asString(dig(metadata, 'product_id')) ||
    asString(dig(metadata, 'sku')) ||
    asString(dig(metadata, 'course_sku'))

  if (fromMeta) return fromMeta

  const items = (data.items ?? dig(data, 'order.items')) as unknown
  if (Array.isArray(items) && items.length > 0) {
    const first = items[0] as Record<string, unknown>
    return (
      asString(first.code) ||
      asString(first.id) ||
      asString(first.description)
    )
  }

  return null
}

function extractCatalogProductId(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? payload) as Record<string, unknown>
  const metadata = (data.metadata ?? payload.metadata) as
    | Record<string, unknown>
    | undefined
  return (
    asString(dig(metadata, 'catalog_product_id')) ||
    asString(dig(metadata, 'mediz_catalog_product_id'))
  )
}

function extractTransactionId(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? payload) as Record<string, unknown>
  return (
    asString(dig(data, 'id')) ||
    asString(dig(payload, 'id')) ||
    asString(dig(data, 'charge_id')) ||
    asString(dig(data, 'order_id'))
  )
}

const PAID_EVENTS = new Set([
  'charge.paid',
  'order.paid',
  'charge_paid',
  'order_paid',
  'payment.approved',
  'transaction.paid'
])

const REFUND_EVENTS = new Set([
  'charge.refunded',
  'charge.refund',
  'charge.chargedback',
  'order.canceled',
  'charge.canceled'
])

export function isStonePaidEvent(eventType: string): boolean {
  const normalized = eventType.toLowerCase().replace(/_/g, '.')
  return PAID_EVENTS.has(normalized) || normalized.includes('paid')
}

export function isStoneRefundEvent(eventType: string): boolean {
  const normalized = eventType.toLowerCase().replace(/_/g, '.')
  return (
    REFUND_EVENTS.has(normalized) ||
    normalized.includes('refund') ||
    normalized.includes('chargedback')
  )
}

export function parseStoneWebhook(
  payload: Record<string, unknown>
): StoneWebhookPurchase | null {
  const eventType = asString(payload.type ?? payload.event ?? payload.name)
  const transactionId = extractTransactionId(payload)
  const email = extractEmail(payload)

  if (!eventType || !transactionId || !email) return null

  return {
    eventType,
    transactionId,
    email,
    nome: extractName(payload),
    cpf: extractCpf(payload),
    stoneProductId: extractStoneProductId(payload),
    catalogProductId: extractCatalogProductId(payload)
  }
}
