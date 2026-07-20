import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const [profile, facts] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: id },
      select: { lifeCompact: true, lastConversationAt: true, lastTopic: true }
    }),
    prisma.userFact.findMany({
      where: { userId: id },
      orderBy: [{ type: 'asc' }, { relevance: 'desc' }, { lastMentionedAt: 'desc' }]
    })
  ])

  return NextResponse.json(
    {
      lifeCompact: profile?.lifeCompact ?? null,
      lastConversationAt: profile?.lastConversationAt?.toISOString() ?? null,
      lastTopic: profile?.lastTopic ?? null,
      facts: facts.map((fact) => ({
        id: fact.id,
        type: fact.type,
        fact: fact.fact,
        category: fact.category,
        status: fact.status,
        approach: fact.approach,
        sensitivity: fact.sensitivity,
        confidence: fact.confidence,
        relevance: fact.relevance,
        evidence: fact.evidence,
        createdAt: fact.createdAt.toISOString(),
        lastMentionedAt: fact.lastMentionedAt.toISOString(),
        resolvedAt: fact.resolvedAt?.toISOString() ?? null
      }))
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
