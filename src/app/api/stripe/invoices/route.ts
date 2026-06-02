import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Busca no banco o stripeCustomerId do usuário
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true }
  })
  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json({ invoices: [] })
  }

  try {
    // Lista as invoices (você pode paginar, expandir mais campos etc)
    const resp = await stripe.invoices.list({
      customer: dbUser.stripeCustomerId,
      limit: 50,
      expand: ['data.invoice_pdf']
    })

    // Serializa apenas o que precisa no client
    const invoices = resp.data.map(inv => ({
      id: inv.id,
      created: inv.created,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      pdf: inv.invoice_pdf
    }))

    return NextResponse.json({ invoices })
  } catch (err) {
    console.error('Erro ao buscar invoices:', err)
    return NextResponse.json(
      { error: 'Não foi possível buscar histórico' },
      { status: 500 }
    )
  }
}
