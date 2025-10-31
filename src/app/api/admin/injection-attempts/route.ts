// src/app/api/admin/injection-attempts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const ip = searchParams.get('ip')

    // Construir filtros
    const where: {
      type?: string
      severity?: string
      ipAddress?: { contains: string }
    } = {}
    
    if (type && type !== 'all') {
      where.type = type
    }
    
    if (severity && severity !== 'all') {
      where.severity = severity
    }
    
    if (ip) {
      where.ipAddress = {
        contains: ip
      }
    }

    // Buscar tentativas
    const [attempts, total] = await Promise.all([
      prisma.injectionAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.injectionAttempt.count({ where })
    ])

    // Calcular estatísticas
    const [totalCount, sqlCount, cmdCount, criticalCount, last24hCount] = await Promise.all([
      prisma.injectionAttempt.count(),
      prisma.injectionAttempt.count({ where: { type: 'SQL_INJECTION' } }),
      prisma.injectionAttempt.count({ where: { type: 'COMMAND_INJECTION' } }),
      prisma.injectionAttempt.count({ where: { severity: 'critical' } }),
      prisma.injectionAttempt.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    const stats = {
      total: totalCount,
      sqlInjection: sqlCount,
      commandInjection: cmdCount,
      critical: criticalCount,
      last24h: last24hCount
    }

    return NextResponse.json({
      success: true,
      attempts,
      total,
      page,
      limit,
      stats
    })
  } catch (error) {
    console.error('[InjectionAttempts API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar tentativas' 
    }, { status: 500 })
  }
}

