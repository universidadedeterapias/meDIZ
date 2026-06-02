import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { PlanInterval } from '@prisma/client'

export async function GET() {
  const plans = await prisma.plan.findMany({
    select: { id: true, name: true, stripePriceId: true }
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Array<{
      name: string
      stripePriceId: string
      stripeProductId?: string
      amount: number
      currency: string
      interval: PlanInterval
      intervalCount: number
      trialPeriodDays?: number
    }>

    for (const p of body) {
      await prisma.plan.upsert({
        where: { stripePriceId: p.stripePriceId },
        create: {
          name: p.name,
          stripePriceId: p.stripePriceId,
          stripeProductId: p.stripeProductId,
          amount: p.amount,
          currency: p.currency,
          interval: p.interval,
          intervalCount: p.intervalCount,
          trialPeriodDays: p.trialPeriodDays
        },
        update: {
          name: p.name,
          stripeProductId: p.stripeProductId,
          amount: p.amount,
          currency: p.currency,
          interval: p.interval,
          intervalCount: p.intervalCount,
          trialPeriodDays: p.trialPeriodDays
        }
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
