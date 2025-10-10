import { prisma } from '@/lib/prisma'
import { HotmartEvent, HotmartPayload, PurchaseStatus } from '@/types/hotmart'
import { NextRequest, NextResponse } from 'next/server'

// Logs sempre ativos para debug em produção
const log = (...args: unknown[]) => {
  console.log('[hotmart]', ...args)
}

const logError = (...args: unknown[]) => {
  console.error('[hotmart ERROR]', ...args)
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
  const startTime = Date.now()
  log('========== NOVO WEBHOOK RECEBIDO ==========')
  
  try {
    const bodyText = await req.text()
    log('Body recebido, tamanho:', bodyText.length, 'bytes')

    let parsed: HotmartPayload
    try {
      parsed = JSON.parse(bodyText)
      log('JSON parseado com sucesso')
      log('Evento:', parsed.event)
      log('Status da compra:', parsed.data.purchase.status)
    } catch (parseError) {
      logError('Falha ao parsear JSON:', parseError)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // 1) Apenas eventos relevantes (compra aprovada)
    if (!isPurchaseApproved(parsed)) {
      log('⏭️ Evento ignorado (não é compra aprovada):', {
        evento: parsed.event,
        status: parsed.data.purchase.status
      })
      return NextResponse.json({ received: true, ignored: true })
    }
    log('✅ Evento é compra aprovada')

    // 2) Filtra pelo produto de interesse (Mediz)
    const medizProductId = process.env.HOTMART_MEDIZ_PRODUCT_ID
    const incomingProductId = getProductId(parsed)
    
    log('Verificando produto:', {
      recebido: incomingProductId,
      esperado: medizProductId,
      configurado: !!medizProductId
    })

    if (!medizProductId) {
      logError('❌ HOTMART_MEDIZ_PRODUCT_ID não está definido nas variáveis de ambiente!')
      return NextResponse.json(
        { error: 'HOTMART_MEDIZ_PRODUCT_ID not configured' },
        { status: 500 }
      )
    }

    if (!incomingProductId) {
      logError('❌ Product ID não encontrado no payload')
      return NextResponse.json(
        { error: 'Product ID missing in payload' },
        { status: 400 }
      )
    }

    if (incomingProductId !== medizProductId) {
      log('⏭️ Produto diferente, ignorando:', {
        recebido: incomingProductId,
        esperado: medizProductId
      })
      return NextResponse.json({ received: true, ignored: true })
    }
    log('✅ Produto correto (Mediz)')

    // 3) Periodicidade → plano
    const periodicity = inferPeriodicity(parsed)
    log('Periodicidade inferida:', periodicity)
    log('Dados usados para inferência:', {
      offerCode: parsed.data.purchase.offer?.code,
      priceValue: parsed.data.purchase.price.value
    })

    const codeMonthly =
      process.env.HOTMART_MONTHLY_PRICE_CODE || 'price_hotmart_mensal'
    const codeYearly =
      process.env.HOTMART_YEARLY_PRICE_CODE || 'price_hotmart_anual'
    const planCodeToFind = periodicity === 'year' ? codeYearly : codeMonthly

    log('Buscando plano no DB:', planCodeToFind)

    const plan = await prisma.plan.findUnique({
      where: { stripePriceId: planCodeToFind }
    })

    if (!plan) {
      logError('❌ Plano Hotmart não encontrado no DB:', {
        planCode: planCodeToFind,
        periodicity,
        codeMonthly,
        codeYearly
      })
      return NextResponse.json(
        { error: 'Plan not found', planCode: planCodeToFind },
        { status: 400 }
      )
    }
    log('✅ Plano encontrado:', { id: plan.id, name: plan.name })

    // 4) Usuário (cria se não existir)
    const email = getBuyerEmail(parsed)
    log('Email do comprador:', email)

    let user = await prisma.user.findUnique({ where: { email } })
    
    if (!user) {
      log('Usuário não existe, criando novo...')
      const userName =
        parsed.data.buyer.name ||
        [parsed.data.buyer.first_name, parsed.data.buyer.last_name]
          .filter(Boolean)
          .join(' ') ||
        null
      
      user = await prisma.user.create({
        data: {
          email,
          name: userName
        }
      })
      log('✅ Usuário criado:', { id: user.id, email: user.email })
    } else {
      log('✅ Usuário já existe:', { id: user.id, email: user.email })
    }

    // 5) Subscrição (idempotente por transaction)
    const syntheticId = buildSyntheticSubId(parsed)
    log('Subscription ID sintético:', syntheticId)

    const now = new Date()
    const start = now
    const end = periodicity === 'year' ? addYears(now, 1) : addMonths(now, 1)

    log('Criando/atualizando subscrição:', {
      userId: user.id,
      planId: plan.id,
      subscriptionId: syntheticId,
      periodo: `${start.toISOString()} até ${end.toISOString()}`
    })

    const subscription = await prisma.subscription.upsert({
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

    const duration = Date.now() - startTime
    log('✅✅✅ WEBHOOK PROCESSADO COM SUCESSO ✅✅✅')
    log('Subscription ID:', subscription.id)
    log('Tempo total:', duration, 'ms')
    log('==========================================')

    return NextResponse.json({ 
      received: true, 
      success: true,
      subscriptionId: subscription.id 
    })

  } catch (err) {
    const duration = Date.now() - startTime
    logError('💥 ERRO CRÍTICO NO WEBHOOK:', err)
    logError('Stack trace:', err instanceof Error ? err.stack : 'N/A')
    logError('Tempo até erro:', duration, 'ms')
    
    return NextResponse.json(
      { 
        error: 'Webhook handler failed',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}