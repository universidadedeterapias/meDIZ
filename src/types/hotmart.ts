enum HotmartEvent {
  PURCHASE_APPROVED = 'PURCHASE_APPROVED',
  PURCHASE_COMPLETE = 'PURCHASE_COMPLETE',
  PURCHASE_CANCELLED = 'PURCHASE_CANCELLED',
  PURCHASE_CHARGEBACK = 'PURCHASE_CHARGEBACK',
  PURCHASE_REFUNDED = 'PURCHASE_REFUNDED',
  PURCHASE_EXPIRED = 'PURCHASE_EXPIRED',
  // Eventos de assinatura
  SUBSCRIPTION_CANCELLATION = 'SUBSCRIPTION_CANCELLATION',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED'
}

enum PurchaseStatus {
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
  CHARGEBACK = 'CHARGEBACK'
}

enum PaymentType {
  CREDIT_CARD = 'CREDIT_CARD',
  BOLETO = 'BOLETO',
  PIX = 'PIX'
}

type Product = {
  id: string | number
  ucode?: string
  name?: string
  warranty_date?: string
  support_email?: string
  has_co_production?: boolean
  is_physical_product?: boolean
}

type Buyer = {
  email: string
  name?: string
  first_name?: string
  last_name?: string
  checkout_phone_code?: string
  checkout_phone?: string
  address?: {
    city?: string
    country?: string
    country_iso?: string
    state?: string
    neighborhood?: string
    zipcode?: string
    address?: string
    number?: string
    complement?: string
  }
  document?: string
  document_type?: string
}

type Purchase = {
  approved_date?: number
  full_price?: { value: number; currency_value: string }
  price: { value: number; currency_value: string }
  checkout_country?: { name: string; iso: string }
  order_bump?: { is_order_bump: boolean }
  origin?: { sck?: string; xcod?: string }
  original_offer_price?: { value: number; currency_value: string }
  order_date: number
  status: PurchaseStatus
  transaction: string
  payment?: { installments_number: number; type: PaymentType }
  offer?: { code: string; name?: string; description?: string }
  invoice_by?: string
  subscription_anticipation_purchase?: boolean
  date_next_charge?: number
  recurrence_number?: number
  is_funnel?: boolean
  business_model?: string
}

type SubscriptionPlan = {
  id: number
  name: string
}

type SubscriptionData = {
  status: string
  plan?: SubscriptionPlan
  subscriber?: { code: string }
  id?: number
}

// Estrutura alternativa para SUBSCRIPTION_CANCELLATION
type SubscriptionCancellationData = {
  subscriber: {
    code: string
    name?: string
    email: string
    phone?: {
      dddPhone?: string
      phone?: string
      dddCell?: string
      cell?: string
    }
  }
  subscription: {
    id: number
    plan: SubscriptionPlan
  }
  actual_recurrence_value?: number
  cancellation_date?: number
  date_next_charge?: number
  product: {
    id: number | string
    name?: string
  }
}

export type HotmartPayload = {
  id: string
  creation_date: number
  event: HotmartEvent
  version: string
  data: {
    product: Product
    affiliates?: { affiliate_code: string; name: string }[]
    buyer?: Buyer // Opcional para eventos de assinatura sem purchase
    producer?: { name: string; document: string; legal_nature: string }
    commissions?: { value: number; source: string; currency_value: string }[]
    purchase?: Purchase // Opcional para SUBSCRIPTION_CANCELLATION
    subscription?: SubscriptionData
    // Campos específicos para SUBSCRIPTION_CANCELLATION
    subscriber?: SubscriptionCancellationData['subscriber']
    actual_recurrence_value?: number
    cancellation_date?: number
    date_next_charge?: number
  }
}

export { HotmartEvent, PaymentType, PurchaseStatus }
