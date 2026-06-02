import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function PATCH() {
  // 1) Auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2) Busca a assinatura ativa/trialing no banco (Stripe, Hotmart ou admin)
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ['active', 'ACTIVE', 'trialing', 'past_due'] }
    }
  })
  if (!subscription) {
    return NextResponse.json(
      { error: 'Assinatura não encontrada ou já cancelada' },
      { status: 404 }
    )
  }

  const sid = subscription.stripeSubscriptionId ?? ''
  const isHotmart = sid.startsWith('hotmart_')
  const isAdminGranted = sid.startsWith('sub_admin_')
  const isStripe = sid.startsWith('sub_') && !isAdminGranted

  try {
    if (isStripe && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      await stripe.subscriptions.update(sid, {
        cancel_at_period_end: true
      })
    }
    // Hotmart e sub_admin_: só atualizamos o DB (não existe no Stripe)

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.stripeSubscriptionId },
      data: { status: 'cancel_at_period_end' }
    })

    return NextResponse.json({
      message: 'Cancelamento agendado',
      provider: isHotmart ? 'hotmart' : isAdminGranted ? 'admin' : 'stripe'
    })
  } catch (err) {
    console.error('Erro ao cancelar assinatura:', err)
    return NextResponse.json(
      { error: 'Falha ao cancelar assinatura' },
      { status: 500 }
    )
  }
}
