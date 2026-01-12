import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// No App Router do Next.js 15, não precisamos de export const config
// O body já vem como ReadableStream

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper para coletar o raw body como Buffer
// No App Router, req.body é um ReadableStream
// eslint-disable-next-line no-undef
async function buffer(readable: ReadableStream<Uint8Array> | null): Promise<Buffer> {
  if (!readable) {
    throw new Error('Request body is null')
  }
  const chunks: Buffer[] = []
  const reader = readable.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}

export async function POST(req: NextRequest) {
  const webhookStartTime = Date.now()
  console.log('🔔 [STRIPE WEBHOOK] ========== WEBHOOK RECEBIDO ==========')
  console.log('🔔 [STRIPE WEBHOOK] Timestamp:', new Date().toISOString())
  
  // 1) Verifica assinatura do Stripe
  const buf = await buffer(req.body)
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
    console.log('✅ [STRIPE WEBHOOK] Assinatura verificada. Evento:', event.type)
    console.log('✅ [STRIPE WEBHOOK] Event ID:', event.id)
    console.log('✅ [STRIPE WEBHOOK] Event Created:', new Date(event.created * 1000).toISOString())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('⚠️ [STRIPE WEBHOOK] Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log('📦 [STRIPE WEBHOOK] ========== PROCESSANDO SUBSCRIPTION ==========')
        console.log('📦 [STRIPE WEBHOOK] Tipo de evento:', event.type)
        const sub = event.data.object as Stripe.Subscription
        
        // Validar se há items na assinatura
        if (!sub.items || !sub.items.data || sub.items.data.length === 0) {
          console.error('❌ [STRIPE WEBHOOK] Assinatura sem items:', sub.id)
          break
        }
        
        const item = sub.items.data[0] as Stripe.SubscriptionItem

        // Acessar propriedades de período de forma segura
        const periodStart = 'current_period_start' in sub && typeof sub.current_period_start === 'number' 
          ? sub.current_period_start 
          : null
        const periodEnd = 'current_period_end' in sub && typeof sub.current_period_end === 'number'
          ? sub.current_period_end
          : null

        console.log('🔍 [STRIPE WEBHOOK] Subscription ID:', sub.id)
        console.log('🔍 [STRIPE WEBHOOK] Customer ID:', sub.customer)
        console.log('🔍 [STRIPE WEBHOOK] Status:', sub.status)
        console.log('🔍 [STRIPE WEBHOOK] Cancel at period end:', sub.cancel_at_period_end)
        console.log('🔍 [STRIPE WEBHOOK] Current Period Start (timestamp):', periodStart || 'N/A')
        console.log('🔍 [STRIPE WEBHOOK] Current Period End (timestamp):', periodEnd || 'N/A')
        if (periodStart) {
          console.log('🔍 [STRIPE WEBHOOK] Current Period Start (date):', new Date(periodStart * 1000).toISOString())
        }
        if (periodEnd) {
          console.log('🔍 [STRIPE WEBHOOK] Current Period End (date):', new Date(periodEnd * 1000).toISOString())
        }
        
        // Log adicional para debug de renovação
        const now = Math.floor(Date.now() / 1000)
        if (periodEnd) {
          const daysUntilRenewal = Math.floor((periodEnd - now) / 86400)
          console.log('🔍 [STRIPE WEBHOOK] Dias até renovação:', daysUntilRenewal)
        }

        // 1a) Busca o usuário pelo stripeCustomerId
        const customerId = sub.customer as string
        console.log('🔍 [STRIPE WEBHOOK] Buscando usuário com stripeCustomerId:', customerId)
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId }
        })
        if (!user) {
          console.warn(`⚠️ [STRIPE WEBHOOK] Usuário Stripe ${customerId} não encontrado no DB`)
          break
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [STRIPE WEBHOOK] Usuário encontrado:', user.id)
        }

        // 1b) Busca o plano pelo stripePriceId
        const priceId =
          typeof item.price === 'string' ? item.price : item.price.id
        console.log('🔍 [STRIPE WEBHOOK] Buscando plano com stripePriceId:', priceId)
        let plan = await prisma.plan.findUnique({
          where: { stripePriceId: priceId }
        })
        if (!plan) {
          console.warn(`⚠️ [STRIPE WEBHOOK] Plano Stripe ${priceId} não encontrado no DB`)
          break
        }
        console.log('✅ [STRIPE WEBHOOK] Plano encontrado:', plan.id, plan.name)

        // 🔄 ATUALIZAÇÃO AUTOMÁTICA: Buscar nome do produto no Stripe e atualizar se diferente
        try {
          const price = typeof item.price === 'string' 
            ? await stripe.prices.retrieve(item.price)
            : item.price
          
          if (price.product) {
            const productId = typeof price.product === 'string' ? price.product : price.product.id
            const product = await stripe.products.retrieve(productId)
            const productName = product.name || product.id
            
            // Se o nome do produto no Stripe for diferente do nome no banco, atualizar
            if (productName && productName.trim() !== '' && plan.name !== productName) {
              console.log('🔄 [STRIPE WEBHOOK] Nome do produto diferente detectado. Atualizando nome no banco...', {
                nomeAntigo: plan.name,
                nomeNovo: productName,
                priceId: priceId
              })
              
              plan = await prisma.plan.update({
                where: { id: plan.id },
                data: { name: productName }
              })
              console.log('✅ [STRIPE WEBHOOK] Nome do plano atualizado com sucesso:', {
                id: plan.id,
                nomeAtualizado: plan.name
              })
            }
          }
        } catch (updateError) {
          console.error('⚠️ [STRIPE WEBHOOK] Erro ao atualizar nome do plano (não crítico):', updateError)
          // Não falhar o webhook por causa disso, apenas logar o erro
        }

        // 2) Determina o status a gravar
        //    Se o Stripe indicar cancel_at_period_end, usamos nosso status customizado
        const newStatus = sub.cancel_at_period_end
          ? 'cancel_at_period_end'
          : sub.status
        console.log('📝 [STRIPE WEBHOOK] Status a gravar:', newStatus)

        // 3) Upsert na subscription
        // CORREÇÃO: current_period_start e current_period_end estão em 'sub', não em 'item'
        const periodStartNum = periodStart || Math.floor(Date.now() / 1000)
        const periodEndNum = periodEnd || Math.floor(Date.now() / 1000)
        const periodStartDate = new Date(periodStartNum * 1000)
        const periodEndDate = new Date(periodEndNum * 1000)
        console.log('📅 [STRIPE WEBHOOK] Period Start:', periodStartDate.toISOString())
        console.log('📅 [STRIPE WEBHOOK] Period End:', periodEndDate.toISOString())

        // Buscar assinatura existente para comparar períodos (debug de renovação)
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id }
        })
        
        if (existingSubscription) {
          console.log('🔄 [STRIPE WEBHOOK] Assinatura existente encontrada. Comparando períodos:')
          console.log('🔄 [STRIPE WEBHOOK] Período antigo - Start:', existingSubscription.currentPeriodStart.toISOString())
          console.log('🔄 [STRIPE WEBHOOK] Período antigo - End:', existingSubscription.currentPeriodEnd.toISOString())
          console.log('🔄 [STRIPE WEBHOOK] Período novo - Start:', periodStartDate.toISOString())
          console.log('🔄 [STRIPE WEBHOOK] Período novo - End:', periodEndDate.toISOString())
          const isRenewal = periodStartDate.getTime() > existingSubscription.currentPeriodStart.getTime()
          console.log('🔄 [STRIPE WEBHOOK] É renovação?', isRenewal)
        } else {
          console.log('🆕 [STRIPE WEBHOOK] Nova assinatura - será criada no banco')
        }

        const subscription = await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          create: {
            userId: user.id,
            planId: plan.id,
            stripeSubscriptionId: sub.id,
            status: newStatus,
            currentPeriodStart: periodStartDate,
            currentPeriodEnd: periodEndDate
          },
          update: {
            status: newStatus,
            currentPeriodStart: periodStartDate,
            currentPeriodEnd: periodEndDate
          }
        })
        console.log('✅ [STRIPE WEBHOOK] Assinatura salva/atualizada no DB:', {
          subscriptionId: subscription.id,
          userId: subscription.userId,
          planId: subscription.planId,
          status: subscription.status,
          statusLowercase: subscription.status.toLowerCase(),
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          isExpired: subscription.currentPeriodEnd < new Date(),
          isActive: ['active', 'ACTIVE', 'cancel_at_period_end'].includes(subscription.status.toLowerCase()) && subscription.currentPeriodEnd >= new Date()
        })
        console.log('✅ [STRIPE WEBHOOK] ========== SUBSCRIPTION PROCESSADA ==========')
        break
      }

      case 'customer.subscription.deleted': {
        console.log('🗑️ [STRIPE WEBHOOK] Processando subscription.deleted')
        const sub = event.data.object as Stripe.Subscription
        console.log('🔍 [STRIPE WEBHOOK] Subscription ID:', sub.id)
        // Quando a assinatura for efetivamente removida, Stripe já coloca status 'canceled'
        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: sub.status }
        })
        console.log('✅ [STRIPE WEBHOOK] Assinatura cancelada no DB')
        break
      }

      case 'invoice.payment_succeeded': {
        console.log('💰 [STRIPE WEBHOOK] ========== PROCESSANDO INVOICE.PAYMENT_SUCCEEDED ==========')
        console.log('💰 [STRIPE WEBHOOK] Este é o evento PRINCIPAL de renovação de assinatura')
        const invoice = event.data.object as Stripe.Invoice
        
        console.log('🔍 [STRIPE WEBHOOK] Invoice ID:', invoice.id)
        console.log('🔍 [STRIPE WEBHOOK] Customer ID:', invoice.customer)
        
        // Acessar subscription de forma segura (pode ser string ou objeto expandido)
        const subscriptionRef = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
        console.log('🔍 [STRIPE WEBHOOK] Subscription ID:', subscriptionRef || 'N/A')
        console.log('🔍 [STRIPE WEBHOOK] Amount Paid:', invoice.amount_paid)
        console.log('🔍 [STRIPE WEBHOOK] Status:', invoice.status)
        
        // Verificar se é uma renovação de assinatura (não uma primeira compra)
        if (!subscriptionRef) {
          console.log('ℹ️ [STRIPE WEBHOOK] Invoice não está associado a uma assinatura (pode ser pagamento único)')
          break
        }

        // Buscar a assinatura atualizada no Stripe para obter os novos períodos
        const subscriptionId = typeof subscriptionRef === 'string' 
          ? subscriptionRef 
          : subscriptionRef.id
        
        console.log('🔍 [STRIPE WEBHOOK] Buscando assinatura no Stripe:', subscriptionId)
        let subscription: Stripe.Subscription
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price.product']
          })
          console.log('✅ [STRIPE WEBHOOK] Assinatura recuperada do Stripe')
        } catch (stripeError) {
          console.error('❌ [STRIPE WEBHOOK] Erro ao buscar assinatura no Stripe:', stripeError)
          break
        }

        // Extrair períodos atualizados
        const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start
        const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end
        const periodStartDate = new Date(periodStart * 1000)
        const periodEndDate = new Date(periodEnd * 1000)

        console.log('📅 [STRIPE WEBHOOK] Períodos atualizados da assinatura:')
        console.log('📅 [STRIPE WEBHOOK] Period Start:', periodStartDate.toISOString())
        console.log('📅 [STRIPE WEBHOOK] Period End:', periodEndDate.toISOString())

        // Buscar usuário
        const customerId = typeof invoice.customer === 'string' 
          ? invoice.customer 
          : invoice.customer.id
        
        console.log('🔍 [STRIPE WEBHOOK] Buscando usuário com stripeCustomerId:', customerId)
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId }
        })
        
        if (!user) {
          console.warn(`⚠️ [STRIPE WEBHOOK] Usuário Stripe ${customerId} não encontrado no DB`)
          break
        }
        console.log('✅ [STRIPE WEBHOOK] Usuário encontrado:', user.id)

        // Buscar plano
        if (!subscription.items || !subscription.items.data || subscription.items.data.length === 0) {
          console.error('❌ [STRIPE WEBHOOK] Assinatura sem items:', subscription.id)
          break
        }
        
        const item = subscription.items.data[0]
        const priceId = typeof item.price === 'string' ? item.price : item.price.id
        console.log('🔍 [STRIPE WEBHOOK] Buscando plano com stripePriceId:', priceId)
        
        const plan = await prisma.plan.findUnique({
          where: { stripePriceId: priceId }
        })
        
        if (!plan) {
          console.warn(`⚠️ [STRIPE WEBHOOK] Plano Stripe ${priceId} não encontrado no DB`)
          console.warn(`⚠️ [STRIPE WEBHOOK] Continuando mesmo assim - assinatura será atualizada sem plano`)
          // Não quebrar aqui - podemos atualizar a assinatura mesmo sem plano se já existir
          const existingSub = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id }
          })
          if (existingSub) {
            // Atualizar apenas os períodos se a assinatura já existe
            await prisma.subscription.update({
              where: { stripeSubscriptionId: subscription.id },
              data: {
                currentPeriodStart: periodStartDate,
                currentPeriodEnd: periodEndDate,
                status: subscription.cancel_at_period_end ? 'cancel_at_period_end' : subscription.status
              }
            })
            console.log('✅ [STRIPE WEBHOOK] Períodos atualizados mesmo sem plano encontrado')
          }
          break
        }
        console.log('✅ [STRIPE WEBHOOK] Plano encontrado:', plan.id, plan.name)

        // Determinar status
        const newStatus = subscription.cancel_at_period_end
          ? 'cancel_at_period_end'
          : subscription.status
        console.log('📝 [STRIPE WEBHOOK] Status a gravar:', newStatus)

        // Buscar assinatura existente para verificar se é renovação
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id }
        })

        if (existingSubscription) {
          console.log('🔄 [STRIPE WEBHOOK] Assinatura existente encontrada - ATUALIZANDO com novos períodos')
          console.log('🔄 [STRIPE WEBHOOK] Período antigo - End:', existingSubscription.currentPeriodEnd.toISOString())
          console.log('🔄 [STRIPE WEBHOOK] Período novo - End:', periodEndDate.toISOString())
          const isRenewal = periodEndDate.getTime() > existingSubscription.currentPeriodEnd.getTime()
          console.log('🔄 [STRIPE WEBHOOK] É renovação?', isRenewal)
        } else {
          console.log('🆕 [STRIPE WEBHOOK] Assinatura não encontrada - será criada')
        }

        // Atualizar ou criar assinatura com os novos períodos
        const updatedSubscription = await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscription.id },
          create: {
            userId: user.id,
            planId: plan.id,
            stripeSubscriptionId: subscription.id,
            status: newStatus,
            currentPeriodStart: periodStartDate,
            currentPeriodEnd: periodEndDate
          },
          update: {
            status: newStatus,
            currentPeriodStart: periodStartDate,
            currentPeriodEnd: periodEndDate
          }
        })

        console.log('✅ [STRIPE WEBHOOK] Assinatura atualizada no DB após pagamento:', {
          subscriptionId: updatedSubscription.id,
          status: updatedSubscription.status,
          currentPeriodStart: updatedSubscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: updatedSubscription.currentPeriodEnd.toISOString(),
          isExpired: updatedSubscription.currentPeriodEnd < new Date()
        })
        console.log('✅ [STRIPE WEBHOOK] ========== INVOICE.PAYMENT_SUCCEEDED PROCESSADO ==========')
        break
      }

      case 'invoice.payment_failed': {
        console.log('❌ [STRIPE WEBHOOK] ========== PROCESSANDO INVOICE.PAYMENT_FAILED ==========')
        const invoice = event.data.object as Stripe.Invoice
        console.log('🔍 [STRIPE WEBHOOK] Invoice ID:', invoice.id)
        console.log('🔍 [STRIPE WEBHOOK] Customer ID:', invoice.customer)
        
        // Acessar subscription de forma segura
        const subscriptionRef = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
        console.log('🔍 [STRIPE WEBHOOK] Subscription ID:', subscriptionRef || 'N/A')
        console.log('🔍 [STRIPE WEBHOOK] Amount Due:', invoice.amount_due)
        console.log('⚠️ [STRIPE WEBHOOK] Pagamento falhou - assinatura pode estar em past_due')
        
        if (subscriptionRef) {
          const subscriptionId = typeof subscriptionRef === 'string' 
            ? subscriptionRef 
            : subscriptionRef.id
          
          // Atualizar status da assinatura para past_due
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: 'past_due' }
          })
          console.log('✅ [STRIPE WEBHOOK] Status da assinatura atualizado para past_due')
        }
        console.log('✅ [STRIPE WEBHOOK] ========== INVOICE.PAYMENT_FAILED PROCESSADO ==========')
        break
      }

      default:
        console.log('ℹ️ [STRIPE WEBHOOK] Evento não tratado:', event.type)
        console.log('ℹ️ [STRIPE WEBHOOK] Event data keys:', Object.keys(event.data.object || {}))
        // Eventos que você não quer tratar explicitamente
        break
    }

    const duration = Date.now() - webhookStartTime
    console.log('✅ [STRIPE WEBHOOK] Webhook processado com sucesso')
    console.log('⏱️ [STRIPE WEBHOOK] Tempo total de processamento:', duration, 'ms')
    console.log('✅ [STRIPE WEBHOOK] ========== FIM DO WEBHOOK ==========')
    return NextResponse.json({ received: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const duration = Date.now() - webhookStartTime
    console.error('❌ [STRIPE WEBHOOK] ========== ERRO NO WEBHOOK ==========')
    console.error('❌ [STRIPE WEBHOOK] Erro ao processar webhook:', err)
    if (err instanceof Error) {
      console.error('❌ [STRIPE WEBHOOK] Mensagem:', err.message)
      console.error('❌ [STRIPE WEBHOOK] Stack trace:', err.stack)
    }
    console.error('⏱️ [STRIPE WEBHOOK] Tempo até erro:', duration, 'ms')
    console.error('❌ [STRIPE WEBHOOK] ========== FIM DO ERRO ==========')
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
