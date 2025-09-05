enum HotmartEvent {
  PURCHASE_APPROVED = 'PURCHASE_APPROVED'
}

enum PurchaseStatus {
  APPROVED = 'APPROVED'
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
  original_offer_price?: { value: number; currency_value: string }
  order_date: number
  status: PurchaseStatus
  transaction: string
  payment?: { installments_number: number; type: PaymentType }
  offer?: { code: string }
  invoice_by?: string
  subscription_anticipation_purchase?: boolean
  is_funnel?: boolean
  business_model?: string
}

export type HotmartPayload = {
  id: string
  creation_date: number
  event: HotmartEvent
  version: string
  data: {
    product: Product
    affiliates?: { affiliate_code: string; name: string }[]
    buyer: Buyer
    producer?: { name: string; document: string; legal_nature: string }
    commissions?: { value: number; source: string; currency_value: string }[]
    purchase: Purchase
  }
}

export { HotmartEvent, PaymentType, PurchaseStatus }
