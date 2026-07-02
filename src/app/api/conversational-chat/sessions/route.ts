import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  isConversationalChatKind,
  isMedizAgent
} from '@/lib/conversational-chat/config'
import { isUserPremium } from '@/lib/premiumUtils'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const hasPremium = await isUserPremium(session.user.id)
  if (!hasPremium) {
    return NextResponse.json(
      { error: 'Recurso disponível apenas para assinantes premium' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const chatKindRaw = searchParams.get('chatKind')?.trim() ?? ''
  if (!isConversationalChatKind(chatKindRaw)) {
    return NextResponse.json({ error: 'chatKind inválido' }, { status: 400 })
  }

  const agentRaw = searchParams.get('agent')?.trim().toLowerCase() ?? 'all'
  if (agentRaw !== 'all' && !isMedizAgent(agentRaw)) {
    return NextResponse.json({ error: 'agent inválido' }, { status: 400 })
  }

  const period = searchParams.get('period')?.trim() ?? 'all'
  if (!['all', '7d', '30d'].includes(period)) {
    return NextResponse.json({ error: 'period inválido' }, { status: 400 })
  }

  const requestedPage = Number(searchParams.get('page') ?? '1')
  const requestedLimit = Number(searchParams.get('limit') ?? '12')
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 20)
    : 12

  const createdAt = (() => {
    if (period === 'all') return undefined
    const date = new Date()
    date.setDate(date.getDate() - (period === '7d' ? 7 : 30))
    return { gte: date }
  })()

  const where: Prisma.ChatSessionWhereInput = {
    userId: session.user.id,
    chatKind: chatKindRaw,
    threadId: { not: null },
    ...(agentRaw !== 'all' ? { agent: agentRaw } : {}),
    ...(createdAt ? { createdAt } : {})
  }

  const [sessions, total] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        threadId: true,
        agent: true,
        createdAt: true,
        messages: {
          where: { role: 'USER' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { content: true }
        }
      }
    }),
    prisma.chatSession.count({ where })
  ])

  return NextResponse.json({
    sessions: sessions.map((row) => ({
      id: row.id,
      threadId: row.threadId!,
      agent: isMedizAgent(row.agent ?? '') ? row.agent : null,
      createdAt: row.createdAt.toISOString(),
      firstUserMessage: row.messages[0]?.content ?? ''
    })),
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total
    }
  })
}
