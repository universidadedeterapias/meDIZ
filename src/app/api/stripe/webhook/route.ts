import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Desativa o bodyParser padrão para ler o raw body
export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper para coletar o raw body como Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buffer(readable: any) {
  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export async function POST(req: NextRequest) {
  // 1) Verifica assinatura do Stripe
  const buf = await buffer(req.body)
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed.', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const item = sub.items.data[0] as Stripe.SubscriptionItem

        // 1a) Busca o usuário pelo stripeCustomerId
        const customerId = sub.customer as string
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId }
        })
        if (!user) {
          console.warn(`Usuário Stripe ${customerId} não encontrado no DB`)
          break
        }

        // 1b) Busca o plano pelo stripePriceId
        const priceId =
          typeof item.price === 'string' ? item.price : item.price.id
        const plan = await prisma.plan.findUnique({
          where: { stripePriceId: priceId }
        })
        if (!plan) {
          console.warn(`Plano Stripe ${priceId} não encontrado no DB`)
          break
        }

        // 2) Determina o status a gravar
        //    Se o Stripe indicar cancel_at_period_end, usamos nosso status customizado
        const newStatus = sub.cancel_at_period_end
          ? 'cancel_at_period_end'
          : sub.status

        // 3) Upsert na subscription
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          create: {
            userId: user.id,
            planId: plan.id,
            stripeSubscriptionId: sub.id,
            status: newStatus,
            currentPeriodStart: new Date(item.current_period_start * 1000),
            currentPeriodEnd: new Date(item.current_period_end * 1000)
          },
          update: {
            status: newStatus,
            currentPeriodStart: new Date(item.current_period_start * 1000),
            currentPeriodEnd: new Date(item.current_period_end * 1000)
          }
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        // Quando a assinatura for efetivamente removida, Stripe já coloca status 'canceled'
        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: sub.status }
        })
        break
      }

      // Você pode estender com outros eventos, ex:
      // case 'invoice.payment_succeeded': { ... }
      // case 'invoice.payment_failed':  { ... }

      default:
        // Eventos que você não quer tratar explicitamente
        break
    }

    return NextResponse.json({ received: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('❌ Erro ao processar webhook:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
