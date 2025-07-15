import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Desativa o parser padrão pra conseguir ler o raw body
export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // sem apiVersion aqui, ou use a versão suportada pelo seu SDK
})
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper para coletar o raw body
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buffer(readable: any) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export async function POST(req: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        // Pega o primeiro item da assinatura
        const item = sub.items.data[0] as Stripe.SubscriptionItem

        // 1) Busca o usuário pelo stripeCustomerId
        const customerId = sub.customer as string
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId }
        })
        if (!user) {
          console.warn(`Usuário Stripe ${customerId} não encontrado no DB`)
          break
        }

        // 2) Busca o plan pelo stripePriceId usado na assinatura
        //    Note que `item.price` pode ser string ou objeto, dependendo de expand
        const priceId =
          typeof item.price === 'string' ? item.price : item.price.id

        const plan = await prisma.plan.findUnique({
          where: { stripePriceId: priceId }
        })
        if (!plan) {
          console.warn(`Plano Stripe ${priceId} não encontrado no DB`)
          break
        }

        // 3) Agora você já tem `user.id` e `plan.id`, faz o upsert
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          create: {
            userId: user.id,
            planId: plan.id,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodStart: new Date(item.current_period_start * 1000),
            currentPeriodEnd: new Date(item.current_period_end * 1000)
          },
          update: {
            status: sub.status,
            currentPeriodStart: new Date(item.current_period_start * 1000),
            currentPeriodEnd: new Date(item.current_period_end * 1000)
          }
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = obj as Stripe.Subscription
        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'canceled' }
        })
        break
      }

      // case 'invoice.payment_succeeded': {
      //   const invoice = obj as Stripe.Invoice
      //   // opcional: estenda lógica para liberar acesso, enviar e-mail, etc.
      //   break
      // }

      // case 'invoice.payment_failed': {
      //   const invoice = obj as Stripe.Invoice
      //   // opcional: marque como past_due ou notifique usuário
      //   break
      // }

      default:
        // console.log(`Unhandled event type ${event.type}`)
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
