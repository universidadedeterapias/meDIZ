import { isValidCpf, normalizeCpf } from '@/lib/cpf'
import type { HotmartPayload } from '@/types/hotmart'

export function getBuyerEmail(p: HotmartPayload): string {
  return p.data.buyer?.email || p.data.subscriber?.email || ''
}

export function getBuyerName(p: HotmartPayload): string | null {
  const name =
    p.data.buyer?.name ||
    [p.data.buyer?.first_name, p.data.buyer?.last_name]
      .filter(Boolean)
      .join(' ') ||
    p.data.subscriber?.name ||
    null
  const trimmed = name?.trim()
  return trimmed || null
}

export function getBuyerCpf(p: HotmartPayload): string | null {
  const raw = p.data.buyer?.document?.trim()
  if (!raw) return null
  const digits = normalizeCpf(raw)
  if (digits.length !== 11 || !isValidCpf(digits)) return null
  return digits
}

export function getProductId(p: HotmartPayload): string {
  return String(p.data.product.id)
}

export function getOfferCode(p: HotmartPayload): string | null {
  const code = p.data.purchase?.offer?.code?.trim()
  return code || null
}

export function getBuyerPhone(p: HotmartPayload): string | null {
  const buyer = p.data.buyer
  if (!buyer) return null
  const code = buyer.checkout_phone_code?.trim() ?? ''
  const phone = buyer.checkout_phone?.trim() ?? ''
  const digits = `${code}${phone}`.replace(/\D/g, '')
  return digits || null
}

export function getPurchaseTransaction(p: HotmartPayload): string {
  return String(p.data.purchase?.transaction ?? p.id ?? '')
}
