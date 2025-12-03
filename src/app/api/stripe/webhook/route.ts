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
  console.log('🔔 [STRIPE WEBHOOK] Webhook recebido')
  
  // 1) Verifica assinatura do Stripe
  const buf = await buffer(req.body)
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
    console.log('✅ [STRIPE WEBHOOK] Assinatura verificada. Evento:', event.type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('⚠️ [STRIPE WEBHOOK] Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log('📦 [STRIPE WEBHOOK] Processando subscription:', event.type)
        const sub = event.data.object as Stripe.Subscription
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
        console.log('🔍 [STRIPE WEBHOOK] Current Period Start:', periodStart || 'N/A')
        console.log('🔍 [STRIPE WEBHOOK] Current Period End:', periodEnd || 'N/A')

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
        console.log('✅ [STRIPE WEBHOOK] Usuário encontrado:', user.id, user.email)

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
        console.log('✅ [STRIPE WEBHOOK] Assinatura salva/atualizada no DB:', subscription.id)
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

      // Você pode estender com outros eventos, ex:
      // case 'invoice.payment_succeeded': { ... }
      // case 'invoice.payment_failed':  { ... }

      default:
        console.log('ℹ️ [STRIPE WEBHOOK] Evento não tratado:', event.type)
        // Eventos que você não quer tratar explicitamente
        break
    }

    console.log('✅ [STRIPE WEBHOOK] Webhook processado com sucesso')
    return NextResponse.json({ received: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('❌ [STRIPE WEBHOOK] Erro ao processar webhook:', err)
    if (err instanceof Error) {
      console.error('❌ [STRIPE WEBHOOK] Stack trace:', err.stack)
    }
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
