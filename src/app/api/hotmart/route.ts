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
    log('Periodicidade inferida:', { periodicity, reason: periodicityResult.reason })
    log('Dados usados para inferência:', {
      offerCode: parsed.data.purchase.offer?.code,
      priceValue: parsed.data.purchase.price.value
    })

    // ⚠️ IMPORTANTE: O webhook da Hotmart traz o ID do plano em subscription.plan.id
    // Este é o identificador mais confiável e deve ser usado como fonte única de verdade
    // 
    // ESTRATÉGIA: Usar APENAS hotmartId (ID numérico) como fonte de verdade
    // Se não encontrar por hotmartId, retornar erro ao invés de usar fallbacks que podem causar erros
    
    let plan = null
    const hotmartPlanIdRaw = parsed.data.subscription?.plan?.id
    const offerCode = parsed.data.purchase.offer?.code // Apenas para logs
    
    log('📋 Informações do payload:', {
      hotmartPlanIdRaw: hotmartPlanIdRaw || 'não disponível',
      offerCode: offerCode || 'não disponível',
      subscriptionPlanName: parsed.data.subscription?.plan?.name,
      priceValue: parsed.data.purchase.price.value,
      currency: parsed.data.purchase.price.currency_value || 'não disponível',
      // Log completo do subscription.plan para debug
      subscriptionPlan: parsed.data.subscription?.plan ? {
        id: parsed.data.subscription.plan.id,
        name: parsed.data.subscription.plan.name,
        // Outros campos que possam existir
      } : 'não disponível',
      // Log completo do purchase.offer para debug
      purchaseOffer: parsed.data.purchase.offer ? {
        code: parsed.data.purchase.offer.code,
        name: parsed.data.purchase.offer.name,
        description: parsed.data.purchase.offer.description
      } : 'não disponível'
    })

    // Obter moeda do payload para validação
    const currencyFromPayload = parsed.data.purchase.price.currency_value
    
    // ⚠️ FONTE ÚNICA DE VERDADE: Buscar plano APENAS por hotmartId
    if (!hotmartPlanIdRaw) {
      logError('❌ ERRO CRÍTICO: hotmartId não encontrado no payload!', undefined, '[hotmart]', {
        subscriptionData: parsed.data.subscription,
        purchaseData: parsed.data.purchase
      })
      return NextResponse.json(
        { 
          error: 'hotmartId missing in payload', 
          received: true 
        },
        { status: 200 } // Retorna 200 para evitar retry desnecessário
      )
    }
    
    // ⚠️ NORMALIZAÇÃO: Converter hotmartId para número inteiro
    // O webhook pode enviar como string com pontuação (ex: "1.115.304")
    // Precisamos remover a pontuação e converter para número (1115304)
    let hotmartPlanId: number
    try {
      if (typeof hotmartPlanIdRaw === 'number') {
        hotmartPlanId = hotmartPlanIdRaw
      } else if (typeof hotmartPlanIdRaw === 'string') {
        // Remover todos os caracteres não numéricos (pontos, vírgulas, etc)
        const cleanedId = String(hotmartPlanIdRaw).replace(/[^\d]/g, '')
        hotmartPlanId = parseInt(cleanedId, 10)
        
        if (isNaN(hotmartPlanId)) {
          throw new Error(`Não foi possível converter hotmartId para número: ${hotmartPlanIdRaw}`)
        }
        
        log('🔄 [NORMALIZAÇÃO] hotmartId normalizado:', {
          original: hotmartPlanIdRaw,
          normalizado: hotmartPlanId,
          tipoOriginal: typeof hotmartPlanIdRaw
        })
      } else {
        throw new Error(`Tipo de hotmartId não suportado: ${typeof hotmartPlanIdRaw}`)
      }
    } catch (normalizationError) {
      logError('❌ ERRO ao normalizar hotmartId:', normalizationError, '[hotmart]', {
        hotmartPlanIdRaw,
        tipo: typeof hotmartPlanIdRaw
      })
      return NextResponse.json(
        { 
          error: 'Invalid hotmartId format', 
          hotmartId: hotmartPlanIdRaw,
          received: true 
        },
        { status: 200 }
      )
    }
    
    // Buscar plano por hotmartId normalizado (fonte única de verdade)
    plan = await prisma.plan.findUnique({
      where: { hotmartId: hotmartPlanId }
    })
    
    if (!plan) {
      logError('❌ ERRO CRÍTICO: Plano não encontrado no banco pelo hotmartId!', undefined, '[hotmart]', {
        hotmartIdOriginal: hotmartPlanIdRaw,
        hotmartIdNormalizado: hotmartPlanId,
        offerCode: offerCode,
        subscriptionPlanName: parsed.data.subscription?.plan?.name
      })
      logError('💡 Execute: npm run sync-hotmart-plans para sincronizar os planos', undefined, '[hotmart]')
      return NextResponse.json(
        { 
          error: 'Plan not found by hotmartId', 
          hotmartIdOriginal: hotmartPlanIdRaw,
          hotmartIdNormalizado: hotmartPlanId,
          received: true 
        },
        { status: 200 } // Retorna 200 para evitar retry desnecessário
      )
    }
    
    log(`✅ Plano encontrado por hotmartId: ${hotmartPlanId} (original: ${hotmartPlanIdRaw}) -> ${plan.name} (${plan.interval})`)
    
    // 🔍 DEBUG: Comparar nome do payload com nome no banco
    const planNameFromPayload = parsed.data.subscription?.plan?.name
    log('🔍 [DEBUG] Comparação de nomes:', {
      nomeNoBanco: plan.name,
      nomeNoPayload: planNameFromPayload || 'não disponível',
      saoIguais: planNameFromPayload ? plan.name === planNameFromPayload : 'não comparável'
    })
    
    // ⚠️ ATUALIZAÇÃO AUTOMÁTICA: Se o nome do payload for diferente do nome no banco, atualizar
    if (planNameFromPayload && planNameFromPayload.trim() !== '' && plan.name !== planNameFromPayload) {
      log('🔄 [ATUALIZAÇÃO] Nome do plano diferente detectado. Atualizando nome no banco...', {
        nomeAntigo: plan.name,
        nomeNovo: planNameFromPayload,
        hotmartId: hotmartPlanId
      })
      
      try {
        plan = await prisma.plan.update({
          where: { id: plan.id },
          data: { name: planNameFromPayload }
        })
        log('✅ [ATUALIZAÇÃO] Nome do plano atualizado com sucesso:', {
          id: plan.id,
          nomeAtualizado: plan.name
        })
      } catch (updateError) {
        logError('❌ [ATUALIZAÇÃO] Erro ao atualizar nome do plano:', updateError, '[hotmart]', {
          planId: plan.id,
          nomeTentado: planNameFromPayload
        })
        // Não falhar o webhook por causa disso, apenas logar o erro
      }
    }
    
    // ⚠️ VALIDAÇÃO CRÍTICA: Verificar se a moeda corresponde
    // 🔍 DEBUG: Log detalhado da moeda antes da validação
    log('🔍 [DEBUG] Validação de moeda:', {
      moedaPayload: currencyFromPayload || 'não disponível',
      moedaPlano: plan.currency || 'não definida',
      hotmartId: hotmartPlanId,
      nomePlano: plan.name,
      priceValue: parsed.data.purchase.price.value,
      offerCode: offerCode || 'não disponível'
    })
    
    if (currencyFromPayload && plan.currency && 
        plan.currency.toUpperCase() !== currencyFromPayload.toUpperCase()) {
      logError('🚨 ERRO CRÍTICO: Plano encontrado por hotmartId tem moeda diferente do payload!', undefined, '[hotmart]', {
        hotmartId: hotmartPlanId,
        moedaPayload: currencyFromPayload,
        moedaPlano: plan.currency,
        planoNome: plan.name,
        planoId: plan.id,
        priceValue: parsed.data.purchase.price.value,
        offerCode: offerCode || 'não disponível',
        subscriptionPlanName: parsed.data.subscription?.plan?.name,
        // Log completo do payload para debug
        payloadData: {
          subscription: parsed.data.subscription,
          purchase: parsed.data.purchase
        }
      })
      // ⚠️ IMPORTANTE: Não rejeitar o webhook, apenas logar o erro
      // Isso permite que o webhook continue sendo processado mesmo com inconsistência de moeda
      // O problema pode ser na Hotmart enviando dados incorretos
      logError('⚠️ Continuando processamento apesar da inconsistência de moeda...', undefined, '[hotmart]')
    }

    // ⚠️ NOTA: Removidos todos os fallbacks. Agora usamos APENAS hotmartId como fonte de verdade.
    // Se o plano não foi encontrado acima, já retornamos erro.
    
    log('✅ Plano encontrado:', { 
      id: plan.id, 
      name: plan.name, 
      interval: plan.interval,
      stripePriceId: plan.stripePriceId,
      currency: plan.currency || 'NÃO DEFINIDA',
      hotmartId: plan.hotmartId || 'NÃO DEFINIDO',
      hotmartOfferKey: plan.hotmartOfferKey || 'NÃO DEFINIDO',
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