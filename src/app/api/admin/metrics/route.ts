// src/app/api/admin/metrics/route.ts
// API de métricas em tempo real para o painel admin
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getRedisClient } from '@/lib/redis'
import { getCache } from '@/lib/cache'

interface MetricsData {
  // Métricas de usuários
  users: {
    total: number
    active: number // Últimos 7 dias
    premium: number
    newToday: number
    newThisWeek: number
  }
  
  // Métricas de performance
  performance: {
    avgResponseTime: number // ms
    requestsLastHour: number
    errorRate: number // %
  }
  
  // Métricas de chat
  chat: {
    totalSessions: number
    sessionsToday: number
    avgMessagesPerSession: number
  }
  
  // Métricas de assinaturas
  subscriptions: {
    total: number
    active: number
    cancelled: number
    revenue: number // Estimativa (opcional)
  }
  
  // Status dos serviços
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy'
    redis: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured'
  }
  
  // Timestamp
  timestamp: string
  cached: boolean
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Tentar obter do cache primeiro (1 minuto de TTL)
    const cacheKey = `admin-metrics:${session.user.email}`
    const cached = await getCache<MetricsData>(cacheKey, {
      ttl: 60, // 1 minuto
      prefix: 'admin'
    })

    if (cached) {
      return NextResponse.json({
        success: true,
        metrics: cached
      })
    }

    // Se não estiver em cache, buscar dados
    const metrics: MetricsData = {
      users: {
        total: 0,
        active: 0,
        premium: 0,
        newToday: 0,
        newThisWeek: 0
      },
      performance: {
        avgResponseTime: 0,
        requestsLastHour: 0,
        errorRate: 0
      },
      chat: {
        totalSessions: 0,
        sessionsToday: 0,
        avgMessagesPerSession: 0
      },
      subscriptions: {
        total: 0,
        active: 0,
        cancelled: 0,
        revenue: 0
      },
      services: {
        database: 'healthy',
        redis: 'not_configured'
      },
      timestamp: new Date().toISOString(),
      cached: false
    }

    try {
      // 1. Métricas de usuários
      const totalUsersResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "User"
      `
      metrics.users.total = Number(totalUsersResult[0]?.count || 0)

      const activeUsersResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "User" 
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      `
      metrics.users.active = Number(activeUsersResult[0]?.count || 0)

      const newTodayResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "User" 
        WHERE "createdAt" >= CURRENT_DATE
      `
      metrics.users.newToday = Number(newTodayResult[0]?.count || 0)

      const newThisWeekResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "User" 
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
      `
      metrics.users.newThisWeek = Number(newThisWeekResult[0]?.count || 0)

      // Usuários premium (com assinaturas ativas)
      try {
        const premiumUsersResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT u.id) as count 
          FROM "User" u
          INNER JOIN "Subscription" s ON u.id = s."userId"
          WHERE s.status IN ('active', 'ACTIVE', 'cancel_at_period_end')
          AND s."currentPeriodEnd" >= NOW()
        `
        metrics.users.premium = Number(premiumUsersResult[0]?.count || 0)
      } catch {
        metrics.users.premium = 0
      }

      // 2. Métricas de chat
      metrics.chat.totalSessions = await prisma.chatSession.count()

      const sessionsTodayResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "ChatSession" 
        WHERE "startedAt" >= CURRENT_DATE
      `
      metrics.chat.sessionsToday = Number(sessionsTodayResult[0]?.count || 0)

      // Média de mensagens por sessão
      try {
        const avgMessagesResult = await prisma.$queryRaw<Array<{ avg: number }>>`
          SELECT AVG(message_count) as avg
          FROM (
            SELECT COUNT(*) as message_count
            FROM "ChatMessage"
            GROUP BY "chatSessionId"
          ) subquery
        `
        metrics.chat.avgMessagesPerSession = Math.round(
          Number(avgMessagesResult[0]?.avg || 0)
        )
      } catch {
        metrics.chat.avgMessagesPerSession = 0
      }

      // 3. Métricas de assinaturas
      metrics.subscriptions.total = await prisma.subscription.count()

      const activeSubsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "Subscription" 
        WHERE status IN ('active', 'ACTIVE', 'cancel_at_period_end')
        AND "currentPeriodEnd" >= NOW()
      `
      metrics.subscriptions.active = Number(activeSubsResult[0]?.count || 0)

      const cancelledSubsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM "Subscription" 
        WHERE status IN ('canceled', 'CANCELED', 'cancelled')
      `
      metrics.subscriptions.cancelled = Number(cancelledSubsResult[0]?.count || 0)

      // 4. Status dos serviços
      try {
        await prisma.$queryRaw`SELECT 1`
        metrics.services.database = 'healthy'
      } catch {
        metrics.services.database = 'unhealthy'
      }

      const redis = getRedisClient()
      if (redis) {
        try {
          await redis.ping()
          metrics.services.redis = 'healthy'
        } catch {
          metrics.services.redis = 'degraded'
        }
      }

      // 5. Métricas de performance (simplificadas - podem ser melhoradas com Redis)
      // Por enquanto, retornamos valores padrão
      metrics.performance = {
        avgResponseTime: 0, // Seria calculado com logs
        requestsLastHour: 0, // Seria contado com Redis
        errorRate: 0 // Seria calculado com logs
      }

    } catch (error) {
      console.error('[Metrics API] Erro ao buscar métricas:', error)
      metrics.services.database = 'unhealthy'
    }

    // Armazenar no cache (não bloquear se falhar)
    const { setCache } = await import('@/lib/cache')
    setCache(cacheKey, metrics, {
      ttl: 60, // 1 minuto
      prefix: 'admin'
    }).catch(() => {
      // Ignorar erros de cache silenciosamente
    })

    return NextResponse.json({
      success: true,
      metrics
    })

  } catch (error) {
    console.error('[Metrics API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
