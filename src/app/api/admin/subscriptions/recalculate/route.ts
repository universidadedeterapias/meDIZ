import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type PlanInterval = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | string | null

const normalizeDateOnly = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const calculatePeriodEndUtc = (start: Date, interval: PlanInterval, intervalCount: number) => {
  const base = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds()
  ))

  switch ((interval || '').toUpperCase()) {
    case 'YEAR':
      base.setUTCFullYear(base.getUTCFullYear() + intervalCount)
      return base
    case 'MONTH':
      base.setUTCMonth(base.getUTCMonth() + intervalCount)
      return base
    case 'WEEK':
      base.setUTCDate(base.getUTCDate() + intervalCount * 7)
      return base
    case 'DAY':
      base.setUTCDate(base.getUTCDate() + intervalCount)
      return base
    default:
      return null
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { userId } = body as { userId?: string }

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/subscriptions/recalculate:POST:start',message:'Iniciando recálculo de períodos',data:{userIdSuffix:userId.slice(-6)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: {
          select: {
            id: true,
            interval: true,
            intervalCount: true
          }
        }
      }
    })

    let updatedCount = 0
    const updatedIds: string[] = []

    for (const sub of subscriptions) {
      const interval = sub.plan?.interval
      if (!interval) {
        continue
      }
      const intervalCount = sub.plan.intervalCount ?? 1
      const expectedEnd = calculatePeriodEndUtc(sub.currentPeriodStart, interval, intervalCount)
      if (!expectedEnd) {
        continue
      }

      const currentDateOnly = normalizeDateOnly(sub.currentPeriodEnd)
      const expectedDateOnly = normalizeDateOnly(expectedEnd)

      if (currentDateOnly !== expectedDateOnly) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { currentPeriodEnd: expectedEnd }
        })
        updatedCount += 1
        updatedIds.push(sub.id)
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/subscriptions/recalculate:POST:end',message:'Recálculo concluído',data:{total:subscriptions.length,updatedCount,updatedIdsSample:updatedIds.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({ total: subscriptions.length, updatedCount })
  } catch (error) {
    console.error('Erro ao recalcular períodos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
