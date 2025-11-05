// src/app/api/admin/security-dashboard/route.ts
// API para dashboard de segurança com métricas em tempo real

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getBlockedIPs } from '@/lib/ipBlocker'
import { getLogStats } from '@/lib/logRotation'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Métricas de tentativas de login
    const [loginAttempts24h, loginFailed24h, loginSuccess24h] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: {
            in: ['LOGIN', 'LOGIN_FAILED']
          },
          timestamp: { gte: last24h }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: { gte: last24h }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN',
          timestamp: { gte: last24h }
        }
      })
    ])

    // Alertas de segurança
    const [securityAlerts24h, securityAlerts7d] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: {
            in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS']
          },
          timestamp: { gte: last24h }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: {
            in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS']
          },
          timestamp: { gte: last7d }
        }
      })
    ])

    // Exportações de dados
    const dataExports24h = await prisma.auditLog.count({
      where: {
        action: 'DATA_EXPORT',
        timestamp: { gte: last24h }
      }
    })

    // IPs bloqueados
    const blockedIPs = await getBlockedIPs()

    // Estatísticas de logs
    const logStats = await getLogStats()

    // Tentativas por hora (últimas 24h)
    const hourlyAttempts = []
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
      hourStart.setMinutes(0, 0, 0)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

      const count = await prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: {
            gte: hourStart,
            lt: hourEnd
          }
        }
      })

      hourlyAttempts.push({
        hour: hourStart.toISOString(),
        count
      })
    }

    // Top IPs com mais tentativas
    const topIPs = await prisma.$queryRaw<Array<{ ip_address: string; count: bigint }>>`
      SELECT ip_address, COUNT(*) as count
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= ${last24h}
        AND ip_address IS NOT NULL
        AND ip_address != 'unknown'
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      metrics: {
        loginAttempts: {
          total24h: loginAttempts24h,
          failed24h: loginFailed24h,
          success24h: loginSuccess24h,
          successRate: loginAttempts24h > 0 
            ? ((loginSuccess24h / loginAttempts24h) * 100).toFixed(2)
            : '0.00'
        },
        securityAlerts: {
          last24h: securityAlerts24h,
          last7d: securityAlerts7d
        },
        dataExports: {
          last24h: dataExports24h
        },
        blockedIPs: {
          count: blockedIPs.length,
          list: blockedIPs
        },
        logs: logStats,
        hourlyAttempts,
        topIPs: topIPs.map(ip => ({
          ip: ip.ip_address,
          attempts: Number(ip.count)
        }))
      }
    })

  } catch {
    return NextResponse.json({ 
      error: 'Erro ao obter métricas de segurança' 
    }, { status: 500 })
  }
}

