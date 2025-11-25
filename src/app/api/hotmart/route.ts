import { prisma } from '@/lib/prisma'
import { HotmartEvent, HotmartPayload, PurchaseStatus } from '@/types/hotmart'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Usa logger que reda PII e desativa logs em produção
const log = (message: string, data?: string | Record<string, unknown>) => {
  if (typeof data === 'string') {
    logger.debug(message, '[hotmart]', { value: data })
  } else if (data) {
    logger.debug(message, '[hotmart]', data)
  } else {
    logger.debug(message, '[hotmart]')
  }
}

const logError = (message: string, error?: unknown, context?: string, data?: Record<string, unknown>) => {
  const err = error instanceof Error ? error : undefined
  logger.error(message, err, context || '[hotmart ERROR]', data)
}

function isPurchaseApproved(p: HotmartPayload): boolean {
  const eventOk = p.event === HotmartEvent.PURCHASE_APPROVED || p.event === HotmartEvent.PURCHASE_COMPLETE
  const statusOk = p.data.purchase?.status && (
    p.data.purchase.status === PurchaseStatus.APPROVED || 
    p.data.purchase.status === PurchaseStatus.COMPLETED
  )
  return eventOk || statusOk || false
}

function isPurchaseCancelled(p: HotmartPayload): boolean {
  const cancelledEvents = [
    HotmartEvent.PURCHASE_CANCELLED,
    HotmartEvent.PURCHASE_REFUNDED,
    HotmartEvent.PURCHASE_EXPIRED,
    HotmartEvent.PURCHASE_CHARGEBACK,
    HotmartEvent.SUBSCRIPTION_CANCELLED,
    HotmartEvent.SUBSCRIPTION_CANCELLATION, // Evento real da Hotmart
    HotmartEvent.SUBSCRIPTION_EXPIRED
  ]
  const cancelledStatuses = [
    PurchaseStatus.CANCELLED,
    PurchaseStatus.REFUNDED,
    PurchaseStatus.EXPIRED,
    PurchaseStatus.CHARGEBACK
  ]
  
  const eventOk = cancelledEvents.includes(p.event as HotmartEvent)
  const statusOk = p.data.purchase?.status && cancelledStatuses.includes(p.data.purchase.status as PurchaseStatus)
  
  return eventOk || statusOk || false
}

async function cancelSubscriptionByTransaction(transactionId: string): Promise<boolean> {
  try {
    const syntheticId = `hotmart_${transactionId}`
    
    log(`🔍 Buscando assinatura para cancelar: ${syntheticId}`)
    
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: syntheticId },
      include: { user: true, plan: true }
    })
    
    if (!subscription) {
      log(`⚠️ Assinatura não encontrada para transaction: ${transactionId}`)
      return false
    }
    
    log(`✅ Assinatura encontrada. Cancelando: ${subscription.id}`)
    
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'canceled' }
    })
    
    log(`✅ Assinatura cancelada com sucesso: ${subscription.id}`)
    return true
  } catch (err) {
    logError('❌ Erro ao cancelar assinatura:', err)
    return false
  }
}

async function cancelSubscriptionByEmail(email: string): Promise<boolean> {
  try {
    log(`🔍 Buscando assinatura para cancelar pelo email: ${email}`)
    
    // Busca usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          where: {
            status: { in: ['active', 'trialing', 'past_due'] },
            stripeSubscriptionId: { startsWith: 'hotmart_' }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    
    if (!user || !user.subscriptions.length) {
      log(`⚠️ Usuário ou assinatura ativa não encontrada para email: ${email}`)
      return false
    }
    
    const subscription = user.subscriptions[0]
    log(`✅ Assinatura encontrada. Cancelando: ${subscription.id}`)
    
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'canceled' }
    })
    
    log(`✅ Assinatura cancelada com sucesso: ${subscription.id}`)
    return true
  } catch (err) {
    logError('❌ Erro ao cancelar assinatura por email:', err)
    return false
  }
}

function getBuyerEmail(p: HotmartPayload): string {
  return p.data.buyer?.email || p.data.subscriber?.email || ''
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

type PeriodicityResult = {
  value: Periodicity
  reason: string
}

function buildPeriodicityResult(
  value: Periodicity,
  reason: string,
  extra?: Record<string, unknown>
): PeriodicityResult {
  log(`✅ Periodicidade inferida: ${value.toUpperCase()} (${reason})`, extra)
  return { value, reason }
}

function inferPeriodicity(p: HotmartPayload): PeriodicityResult {
  // Log detalhado para debug
  const offer = p.data.purchase.offer?.code?.toLowerCase()
  const offerName = p.data.purchase.offer?.name?.toLowerCase()
  const offerDescription = p.data.purchase.offer?.description?.toLowerCase()
  const subscriptionPlanName = p.data.subscription?.plan?.name?.toLowerCase()
  const value = p.data.purchase.price.value
  
  log('🔍 Inferindo periodicidade:', {
    offerCode: offer,
    offerName: offerName,
    offerDescription: offerDescription,
    subscriptionPlanName: subscriptionPlanName,
    priceValue: value,
    productName: p.data.product?.name?.toLowerCase()
  })

  // 1. Verificar pelo código da oferta
  if (offer) {
    const monthlyKeywords = ['mensal', 'monthly', 'm', 'month', 'm01', 'm-', '_m', 'mens']
    const yearlyKeywords = ['anual', 'annual', 'y', 'year', 'y01', 'y-', '_y', 'ano', 'yearly']
    
    if (monthlyKeywords.some(s => offer.includes(s))) {
      return buildPeriodicityResult('month', 'offer code keywords', {
        offer
      })
    }
    if (yearlyKeywords.some(s => offer.includes(s))) {
      return buildPeriodicityResult('year', 'offer code keywords', {
        offer
      })
    }
  }

  // 2. Verificar pela descrição da oferta (muito confiável!)
  if (offerDescription) {
    const monthlyKeywords = ['mensal', 'monthly', 'mês', 'mes']
    const yearlyKeywords = ['anual', 'annual', 'ano', 'yearly']
    
    if (monthlyKeywords.some(s => offerDescription.includes(s))) {
      return buildPeriodicityResult('month', 'offer description keywords', {
        offerDescription
      })
    }
    if (yearlyKeywords.some(s => offerDescription.includes(s))) {
      return buildPeriodicityResult('year', 'offer description keywords', {
        offerDescription
      })
    }
  }

  // 3. Verificar pelo nome do plano da assinatura (muito confiável!)
  if (subscriptionPlanName) {
    const monthlyKeywords = ['mensal', 'monthly', 'mês', 'mes']
    const yearlyKeywords = ['anual', 'annual', 'ano', 'yearly']
    
    if (monthlyKeywords.some(s => subscriptionPlanName.includes(s))) {
      return buildPeriodicityResult('month', 'subscription plan name keywords', {
        subscriptionPlanName
      })
    }
    if (yearlyKeywords.some(s => subscriptionPlanName.includes(s))) {
      return buildPeriodicityResult('year', 'subscription plan name keywords', {
        subscriptionPlanName
      })
    }
  }

  // 4. Verificar pelo nome da oferta (se disponível no payload)
  if (offerName) {
    const monthlyKeywords = ['mensal', 'monthly', 'mês', 'mes']
    const yearlyKeywords = ['anual', 'annual', 'ano', 'yearly']
    
    if (monthlyKeywords.some(s => offerName.includes(s))) {
      return buildPeriodicityResult('month', 'offer name keywords', {
        offerName
      })
    }
    if (yearlyKeywords.some(s => offerName.includes(s))) {
      return buildPeriodicityResult('year', 'offer name keywords', {
        offerName
      })
    }
  }

  // 5. Verificar pelo nome do produto
  const productName = p.data.product?.name?.toLowerCase()
  if (productName) {
    if (productName.includes('anual') || productName.includes('annual') || productName.includes('yearly')) {
      return buildPeriodicityResult('year', 'product name keywords', {
        productName
      })
    }
    if (productName.includes('mensal') || productName.includes('monthly')) {
      return buildPeriodicityResult('month', 'product name keywords', {
        productName
      })
    }
  }

  // 6. Verificar pelo valor (valores maiores indicam anual)
  // Ajuste o threshold conforme necessário. Valores típicos:
  // Mensal: R$ 49-99 (4900-9900 centavos)
  // Anual: R$ 299-599 (29900-59900 centavos)
  // Threshold aumentado para evitar falsos positivos
  // IMPORTANTE: value está em reais, não centavos! No payload exemplo: 39.9 = R$ 39,90
  const valueInCents = Math.round(value * 100) // Converter para centavos se necessário
  if (valueInCents >= 15000) { // R$ 150.00 ou mais = provavelmente anual
      return buildPeriodicityResult('year', 'price threshold', {
        value,
        valueInCents
      })
  }
  
  // Valores muito pequenos (menos de R$ 50) são provavelmente mensais
  if (valueInCents < 5000) {
      return buildPeriodicityResult('month', 'price threshold', {
        value,
        valueInCents
      })
  }
  
  // Por padrão, assumir mensal se não conseguir inferir
  log('⚠️ Não foi possível inferir periodicidade, usando padrão: MONTH')
  return { value: 'month', reason: 'fallback default' }
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
    // Verificar se o método é POST
    if (req.method !== 'POST') {
      logError(`❌ Método não permitido: ${req.method}`)
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const bodyText = await req.text()
    log('Body recebido, tamanho:', `${bodyText.length} bytes`)

    // Verificar se o body não está vazio
    if (!bodyText || bodyText.trim() === '') {
      logError('❌ Body vazio recebido')
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    let parsed: HotmartPayload
    try {
      parsed = JSON.parse(bodyText)
      log('JSON parseado com sucesso')
      log('Evento:', parsed.event)
      
      // Verificar se a estrutura básica existe
      if (!parsed.event || !parsed.data || !parsed.data.purchase) {
        logError('❌ Estrutura de dados inválida', undefined, '[hotmart]', {
          hasEvent: !!parsed.event,
          hasData: !!parsed.data,
          hasPurchase: !!(parsed.data && parsed.data.purchase)
        })
        return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 })
      }
      
      log('Status da compra:', parsed.data.purchase.status)
    } catch (parseError) {
      logError('Falha ao parsear JSON', parseError instanceof Error ? parseError : undefined)
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 })
    }

    // 1) Verificar se é cancelamento/reembolso/expiração
    if (isPurchaseCancelled(parsed)) {
      log('🛑 Evento de cancelamento/reembolso/expirado detectado:', {
        evento: parsed.event,
        status: parsed.data.purchase?.status,
        transaction: parsed.data.purchase?.transaction,
        subscriberEmail: parsed.data.subscriber?.email
      })
      
      let cancelled = false
      
      // Estratégia 1: Se tem purchase.transaction, usar isso
      if (parsed.data.purchase?.transaction) {
        const transactionId = parsed.data.purchase.transaction
        cancelled = await cancelSubscriptionByTransaction(transactionId)
      }
      // Estratégia 2: Se é SUBSCRIPTION_CANCELLATION e tem subscriber.email
      else if (parsed.event === HotmartEvent.SUBSCRIPTION_CANCELLATION && parsed.data.subscriber?.email) {
        const email = parsed.data.subscriber.email
        cancelled = await cancelSubscriptionByEmail(email)
      }
      // Estratégia 3: Se tem buyer.email (como fallback)
      else if (parsed.data.buyer?.email) {
        const email = parsed.data.buyer.email
        cancelled = await cancelSubscriptionByEmail(email)
      }
      else {
        log('⚠️ Não foi possível identificar transaction_id ou email para cancelar assinatura')
      }
      
      return NextResponse.json({
        received: true,
        processed: cancelled,
        action: 'cancelled',
        event: parsed.event,
        transaction: parsed.data.purchase?.transaction,
        email: parsed.data.subscriber?.email || parsed.data.buyer?.email
      })
    }
    
    // 2) Apenas eventos relevantes (compra aprovada)
    if (!isPurchaseApproved(parsed)) {
      log('⏭️ Evento ignorado (não é compra aprovada nem cancelamento):', {
        evento: parsed.event,
        status: parsed.data.purchase?.status
      })
      return NextResponse.json({ received: true, ignored: true })
    }
    log('✅ Evento é compra aprovada')

    // 3) Filtra pelo produto de interesse (Mediz)
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
      logError('Estrutura do payload recebido', undefined, '[hotmart]', { payload: JSON.stringify(parsed, null, 2) })
      return NextResponse.json(
        { error: 'Product ID missing in payload', received: true },
        { status: 200 } // Retorna 200 para evitar retry desnecessário
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
    const periodicityResult = inferPeriodicity(parsed)
    const periodicity = periodicityResult.value
    log('Periodicidade inferida:', periodicity, { reason: periodicityResult.reason })
    log('Dados usados para inferência:', {
      offerCode: parsed.data.purchase.offer?.code,
      priceValue: parsed.data.purchase.price.value
    })

    // ⚠️ IMPORTANTE: O webhook da Hotmart traz dois identificadores:
    // 1. subscription.plan.id (ID numérico: 1115304, 1115305, etc) - MAIS CONFIÁVEL
    // 2. purchase.offer.code (código alfanumérico: "jcuheq2m", etc)
    //
    // ESTRATÉGIA DE BUSCA (em ordem de prioridade):
    // 1. Buscar por hotmartId (ID numérico - mais confiável e estável)
    // 2. Buscar por hotmartOfferKey (código alfanumérico - fallback)
    // 3. Buscar por periodicidade + códigos conhecidos (compatibilidade)
    // 4. Buscar por intervalo (último recurso)
    
    let plan = null
    const hotmartPlanId = parsed.data.subscription?.plan?.id
    const offerCode = parsed.data.purchase.offer?.code
    
    log('📋 Informações do payload:', {
      hotmartPlanId: hotmartPlanId || 'não disponível',
      offerCode: offerCode || 'não disponível',
      subscriptionPlanName: parsed.data.subscription?.plan?.name,
      priceValue: parsed.data.purchase.price.value
    })

    // PRIORIDADE 1: Buscar plano por hotmartId (ID numérico - mais confiável)
    if (hotmartPlanId) {
      plan = await prisma.plan.findUnique({
        where: { hotmartId: hotmartPlanId }
      })
      if (plan) {
        log(`✅ Plano encontrado por hotmartId: ${hotmartPlanId} -> ${plan.name} (${plan.interval})`)
      } else {
        log(`   ⏭️ hotmartId ${hotmartPlanId} não encontrado no banco, tentando outras estratégias...`)
      }
    }

    // PRIORIDADE 2: Buscar plano por hotmartOfferKey (código alfanumérico - fallback)
    if (!plan && offerCode) {
      plan = await prisma.plan.findUnique({
        where: { hotmartOfferKey: offerCode }
      })
      if (plan) {
        log(`✅ Plano encontrado por offerKey: ${offerCode} -> ${plan.name} (${plan.interval})`)
      } else {
        log(`   ⏭️ OfferKey ${offerCode} não encontrado no banco, tentando outras estratégias...`)
      }
    }

    // PRIORIDADE 3: Se não encontrou por ID ou offerKey, buscar por periodicidade + códigos conhecidos
    // A periodicidade já foi inferida acima pela função inferPeriodicity()
    // Definir códigos no escopo mais amplo para uso em logs de erro
    const monthlyCodes = ['price_hotmart_mensal']
    const yearlyCodes = ['price_hotmart_anual']
    const codesToTry = periodicity === 'year' ? yearlyCodes : monthlyCodes

    if (!plan) {
      log('🔍 Buscando plano por periodicidade:', {
        periodicity,
        codesToTry,
        monthlyCodes,
        yearlyCodes,
        subscriptionPlanName: parsed.data.subscription?.plan?.name
      })

      // Tentar buscar plano por qualquer um dos códigos da periodicidade
      for (const code of codesToTry) {
        plan = await prisma.plan.findUnique({
          where: { stripePriceId: code }
        })
        if (plan) {
          log(`✅ Plano encontrado: ${code} -> ${plan.name} (${plan.interval})`)
          break
        } else {
          log(`   ⏭️ Código ${code} não encontrado no banco`)
        }
      }
    }

    // PRIORIDADE 4: Se ainda não encontrou, buscar planos por intervalo
    if (!plan) {
      log('⚠️ Nenhum plano encontrado pelos códigos conhecidos, buscando por intervalo...')
      const plansByInterval = await prisma.plan.findMany({
        where: {
          interval: periodicity === 'year' ? 'YEAR' : 'MONTH',
          active: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      if (plansByInterval.length > 0) {
        // Priorizar planos sem trial (planos base) quando houver múltiplos
        const preferredPlan = plansByInterval.find(p => !p.trialPeriodDays) || plansByInterval[0]
        plan = preferredPlan
        log(`✅ Plano encontrado por intervalo: ${plan.stripePriceId} (${plan.name})`)
        log(`⚠️ Total de planos no intervalo ${periodicity}: ${plansByInterval.length}`)
      }
    }
    
    // PRIORIDADE 5: Se ainda não encontrou, erro crítico
    if (!plan) {
      const allPlans = await prisma.plan.findMany({
        select: { stripePriceId: true, name: true, interval: true, active: true }
      })
      
      logError('❌ Plano Hotmart não encontrado no DB', undefined, '[hotmart]', {
        periodicity,
        hotmartPlanId,
        offerCode,
        codesToTry,
        monthlyCodes,
        yearlyCodes,
        availablePlans: allPlans.map(p => ({
          stripePriceId: p.stripePriceId,
          name: p.name,
          interval: p.interval,
          active: p.active
        }))
      })
      return NextResponse.json(
        { error: 'Plan not found', periodicity, codesToTry, received: true },
        { status: 200 } // Retorna 200 para evitar retry desnecessário
      )
    }
    
    log('✅ Plano encontrado:', { 
      id: plan.id, 
      name: plan.name, 
      interval: plan.interval,
      stripePriceId: plan.stripePriceId,
      periodicityInferida: periodicity
    })
    
    // Validação: verificar se o intervalo do plano bate com a periodicidade inferida
    if (periodicity === 'year' && plan.interval !== 'YEAR') {
      logError('⚠️ AVISO CRÍTICO: Periodicidade inferida é YEAR, mas plano encontrado tem intervalo diferente', undefined, '[hotmart]', { interval: plan.interval })
      logError('Isso causa o problema de assinaturas anuais aparecerem como mensais no admin!')
      logError('Plano encontrado', undefined, '[hotmart]', { name: plan.name, interval: plan.interval, stripePriceId: plan.stripePriceId })
    }
    if (periodicity === 'month' && plan.interval !== 'MONTH') {
      logError('⚠️ AVISO: Periodicidade inferida é MONTH, mas plano encontrado tem intervalo diferente', undefined, '[hotmart]', { interval: plan.interval })
      logError('Plano encontrado', undefined, '[hotmart]', { name: plan.name, interval: plan.interval, stripePriceId: plan.stripePriceId })
    }

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
    const transactionId = parsed.data.purchase.transaction || parsed.id
    log('🔍 DEBUG: Informações da transação:', {
      transactionId,
      syntheticId,
      event: parsed.event,
      purchaseStatus: parsed.data.purchase?.status,
      subscriptionId: parsed.data.subscription?.id
    })

    // 🔍 DEBUG: Verificar se já existe assinatura com este syntheticId
    const existingBySyntheticId = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: syntheticId }
    })
    log('🔍 DEBUG: Assinatura existente por syntheticId:', {
      encontrada: !!existingBySyntheticId,
      id: existingBySyntheticId?.id,
      status: existingBySyntheticId?.status,
      currentPeriodEnd: existingBySyntheticId?.currentPeriodEnd?.toISOString()
    })

    // 🔍 DEBUG: Verificar assinaturas existentes do usuário
    const existingSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        stripeSubscriptionId: { startsWith: 'hotmart_' }
      },
      orderBy: { createdAt: 'desc' }
    })
    log('🔍 DEBUG: Assinaturas existentes do usuário:', {
      total: existingSubscriptions.length,
      detalhes: existingSubscriptions.map(sub => ({
        id: sub.id,
        syntheticId: sub.stripeSubscriptionId,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        createdAt: sub.createdAt.toISOString()
      }))
    })

    const now = new Date()
    const start = now
    const end = periodicity === 'year' ? addYears(now, 1) : addMonths(now, 1)

    log('Criando/atualizando subscrição:', {
      userId: user.id,
      planId: plan.id,
      subscriptionId: syntheticId,
      periodo: `${start.toISOString()} até ${end.toISOString()}`
    })

    // 🎯 ESTRATÉGIA: Se já existe assinatura com este syntheticId, atualizar
    // Caso contrário, verificar se é renovação (usuário já tem assinatura ativa/expirada)
    let subscription
    let isRenewal = false

    if (existingBySyntheticId) {
      // Caso 1: Assinatura com mesmo syntheticId existe (idempotência)
      log('✅ Assinatura existente encontrada por syntheticId, atualizando...')
      subscription = await prisma.subscription.update({
        where: { id: existingBySyntheticId.id },
        data: {
          status: 'active',
          currentPeriodStart: start,
          currentPeriodEnd: end
        }
      })
      log('✅ Assinatura atualizada:', { id: subscription.id })
    } else {
      // Caso 2: Verificar se é renovação (usuário já tem assinatura Hotmart)
      // Considera renovação se:
      // - Status ativo, OU
      // - Status não cancelado e expirou recentemente (últimos 90 dias para cobrir anuais)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const existingActiveOrRecent = existingSubscriptions.find(sub => {
        const isActive = sub.status === 'active' || sub.status === 'ACTIVE'
        const isNotCanceled = sub.status !== 'canceled' && sub.status !== 'CANCELED'
        const expiredRecently = sub.currentPeriodEnd >= ninetyDaysAgo
        return isActive || (isNotCanceled && expiredRecently)
      })

      if (existingActiveOrRecent) {
        // É uma renovação - atualizar a assinatura existente
        isRenewal = true
        log('🔄 RENOVAÇÃO DETECTADA: Assinatura existente encontrada, atualizando ao invés de criar nova')
        log('📋 Detalhes da assinatura existente:', {
          id: existingActiveOrRecent.id,
          syntheticIdAntigo: existingActiveOrRecent.stripeSubscriptionId,
          statusAntigo: existingActiveOrRecent.status,
          syntheticIdNovo: syntheticId
        })

        // Atualizar a assinatura existente com novos dados
        subscription = await prisma.subscription.update({
          where: { id: existingActiveOrRecent.id },
          data: {
            stripeSubscriptionId: syntheticId, // Atualizar com novo transaction ID
            status: 'active',
            currentPeriodStart: start,
            currentPeriodEnd: end,
            planId: plan.id // Atualizar plano caso tenha mudado
          }
        })
        log('✅ Assinatura renovada/atualizada:', { id: subscription.id })

        // Cancelar outras assinaturas ativas do mesmo usuário (evitar duplicatas)
        const otherActiveSubs = existingSubscriptions.filter(sub => 
          sub.id !== existingActiveOrRecent.id && 
          (sub.status === 'active' || sub.status === 'ACTIVE')
        )
        
        if (otherActiveSubs.length > 0) {
          log(`⚠️ Cancelando ${otherActiveSubs.length} assinatura(s) duplicada(s) do usuário`)
          await prisma.subscription.updateMany({
            where: {
              id: { in: otherActiveSubs.map(s => s.id) }
            },
            data: {
              status: 'canceled'
            }
          })
          log('✅ Assinaturas duplicadas canceladas')
        }
      } else {
        // Caso 3: Nova assinatura (primeira compra)
        log('🆕 NOVA ASSINATURA: Criando nova assinatura para o usuário')
        subscription = await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            stripeSubscriptionId: syntheticId,
            status: 'active',
            currentPeriodStart: start,
            currentPeriodEnd: end
          }
        })
        log('✅ Nova assinatura criada:', { id: subscription.id })
      }
    }

    const duration = Date.now() - startTime
    log('✅✅✅ WEBHOOK PROCESSADO COM SUCESSO ✅✅✅')
    log('Subscription ID:', subscription.id)
    log('Tipo de operação:', isRenewal ? 'RENOVAÇÃO' : 'NOVA ASSINATURA')
    log('Tempo total:', `${duration}ms`)
    log('==========================================')

    return NextResponse.json({ 
      received: true, 
      success: true,
      subscriptionId: subscription.id,
      isRenewal,
      action: isRenewal ? 'renewed' : 'created'
    })

  } catch (err) {
    const duration = Date.now() - startTime
    logError('💥 ERRO CRÍTICO NO WEBHOOK', err instanceof Error ? err : undefined)
    if (err instanceof Error) {
      logError('Stack trace', err, '[hotmart]')
    }
    logError(`Tempo até erro: ${duration}ms`)
    
    // Retorna 200 para evitar retry desnecessário da Hotmart
    return NextResponse.json(
      { 
        error: 'Webhook handler failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        received: true
      },
      { status: 200 }
    )
  }
}