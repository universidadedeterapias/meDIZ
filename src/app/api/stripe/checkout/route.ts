// src/app/api/stripe/checkout/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  // 1) Pega e valida a sessão
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2) Busca o usuário completo no banco (que tem stripeCustomerId)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id }
  })
  if (!dbUser) {
    return NextResponse.json(
      { error: 'Usuário não encontrado' },
      { status: 404 }
    )
  }

  // 3) Lê o planId do body e busca o plano
  const { planId } = (await req.json()) as { planId: string }
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  // 4) Garante ou cria o Customer no Stripe
  let customerId = dbUser.stripeCustomerId ?? undefined
  if (!customerId) {
    // Desambigua o tipo para o TS
    const params: Stripe.CustomerCreateParams = {
      email: dbUser.email,
      metadata: { userId: dbUser.id }
    }
    const customer = await stripe.customers.create(params)
    customerId = customer.id

    // Armazena de volta no seu usuário
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { stripeCustomerId: customerId }
    })
  }

  // 5) Cria a sessão de Checkout
  const sessionStripe = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://universidadedeterapias.com.br/aproveite`,
    metadata: { userId: dbUser.id, planId: plan.id }
  })

  return NextResponse.json({ url: sessionStripe.url })
}
