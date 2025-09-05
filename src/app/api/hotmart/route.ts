import { prisma } from '@/lib/prisma'
import { HotmartEvent, HotmartPayload, PurchaseStatus } from '@/types/hotmart'
import { NextRequest, NextResponse } from 'next/server'

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log('[hotmart]', ...args)
}

function isPurchaseApproved(p: HotmartPayload): boolean {
  const eventOk = p.event === HotmartEvent.PURCHASE_APPROVED
  const statusOk = p.data.purchase.status === PurchaseStatus.APPROVED
  return eventOk || statusOk
}

function getBuyerEmail(p: HotmartPayload): string {
  return p.data.buyer.email
}

function getProductId(p: HotmartPayload): string {
  return String(p.data.product.id)
}

function buildSyntheticSubId(p: HotmartPayload): string {
  // garante idempotência por transação
  const tx = p.data.purchase.transaction || p.id
  return `hotmart_${tx}`
}

type Periodicity = 'month' | 'year'

function inferPeriodicity(p: HotmartPayload): Periodicity {
  const offer = p.data.purchase.offer?.code?.toLowerCase()
  if (offer) {
    if (['mensal', 'monthly', 'm', 'month', 'm01'].some(s => offer.includes(s)))
      return 'month'
    if (['anual', 'annual', 'y', 'year', 'y01'].some(s => offer.includes(s)))
      return 'year'
  }

  const value = p.data.purchase.price.value
  if (value >= 800) return 'year'

  return 'month'
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function addYears(date: Date, n: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + n)
  return d
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()

    let parsed: HotmartPayload
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // 1) Apenas eventos relevantes (compra aprovada)
    if (!isPurchaseApproved(parsed)) {
      log('Evento ignorado:', parsed.event, parsed.data.purchase.status)
      return NextResponse.json({ received: true, ignored: true })
    }

    // 2) Filtra pelo produto de interesse (Mediz)
    const medizProductId = process.env.HOTMART_MEDIZ_PRODUCT_ID
    const incomingProductId = getProductId(parsed)
    if (
      !incomingProductId ||
      !medizProductId ||
      incomingProductId !== medizProductId
    ) {
      log('Produto diferente. productId=', incomingProductId)
      return NextResponse.json({ received: true, ignored: true })
    }

    // 3) Periodicidade → plano
    const periodicity = inferPeriodicity(parsed)
    const codeMonthly =
      process.env.HOTMART_MONTHLY_PRICE_CODE || 'price_hotmart_mensal'
    const codeYearly =
      process.env.HOTMART_YEARLY_PRICE_CODE || 'price_hotmart_anual'
    const planCodeToFind = periodicity === 'year' ? codeYearly : codeMonthly

    const plan = await prisma.plan.findUnique({
      where: { stripePriceId: planCodeToFind }
    })

    if (!plan) {
      console.error('Plano Hotmart não encontrado no DB:', planCodeToFind)
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 })
    }

    // 4) Usuário (cria se não existir)
    const email = getBuyerEmail(parsed)
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name:
            parsed.data.buyer.name ||
            [parsed.data.buyer.first_name, parsed.data.buyer.last_name]
              .filter(Boolean)
              .join(' ') ||
            null
        }
      })
    }

    // 5) Subscrição (idempotente por transaction)
    const syntheticId = buildSyntheticSubId(parsed)
    const now = new Date()
    const start = now
    const end = periodicity === 'year' ? addYears(now, 1) : addMonths(now, 1)

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: syntheticId },
      create: {
        userId: user.id,
        planId: plan.id,
        stripeSubscriptionId: syntheticId,
        status: 'active',
        currentPeriodStart: start,
        currentPeriodEnd: end
      },
      update: {
        status: 'active',
        currentPeriodStart: start,
        currentPeriodEnd: end
      }
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Erro no webhook Hotmart:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
