import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function PATCH() {
  // 1) Auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2) Busca a assinatura ativa/trialing no banco
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ['active', 'trialing', 'past_due'] }
    }
  })
  if (!subscription) {
    return NextResponse.json(
      { error: 'Assinatura não encontrada ou já cancelada' },
      { status: 404 }
    )
  }

  try {
    // 3) Agenda o cancelamento no Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    // 4) Marca no seu DB, usando apenas o campo status
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
      data: { status: 'cancel_at_period_end' }
    })

    return NextResponse.json({ message: 'Cancelamento agendado' })
  } catch (err) {
    console.error('Erro ao cancelar assinatura:', err)
    return NextResponse.json(
      { error: 'Falha ao cancelar assinatura' },
      { status: 500 }
    )
  }
}
