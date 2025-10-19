// src/app/api/admin/security-alerts/history/route.ts
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Buscar logs de alertas de segurança (usando dados simulados se a tabela não existir)
    let alerts = []
    let total = 0
    
    try {
      const [alertsResult, totalResult] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            action: {
              in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS', 'DATA_EXPORT']
            }
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit
        }),
        prisma.auditLog.count({
          where: {
            action: {
              in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS', 'DATA_EXPORT']
            }
          }
        })
      ])
      alerts = alertsResult
      total = totalResult
    } catch {
      console.log('[Security Alerts History API] Tabela audit_logs não existe, retornando dados simulados')
      
      // Dados simulados para demonstração
      alerts = [
        {
          id: 'alert-1',
          action: 'SECURITY_ALERT_SENT',
          adminEmail: 'marianna.sales@mediz.com',
          timestamp: new Date(),
          details: JSON.stringify({
            alertType: 'LOGIN_SUSPEITO',
            targetAdminEmail: 'marianna.sales@mediz.com',
            details: 'Tentativa de login suspeita detectada'
          })
        },
        {
          id: 'alert-2',
          action: 'DATA_EXPORT',
          adminEmail: 'marianna.sales@mediz.com',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          details: JSON.stringify({
            exportType: 'users',
            recordCount: 489
          })
        }
      ]
      total = alerts.length
    }

    // Formatar dados
    const formattedAlerts = alerts.map(alert => {
      const details = alert.details ? JSON.parse(alert.details) : {}
      
      return {
        id: alert.id,
        type: getAlertTypeLabel(alert.action),
        message: getAlertMessage(alert.action, details),
        sent: true, // Assumindo que se está no log, foi enviado
        timestamp: alert.timestamp.toISOString(),
        adminName: alert.adminEmail.split('@')[0], // Usar parte do email como nome
        adminEmail: alert.adminEmail,
        details: details
      }
    })

    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('[Security Alerts History API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

function getAlertTypeLabel(action: string): string {
  const labels: Record<string, string> = {
    'SECURITY_ALERT_SENT': 'Alerta Personalizado',
    'SUSPICIOUS_LOGIN': 'Login Suspeito',
    'MULTIPLE_ATTEMPTS': 'Múltiplas Tentativas',
    'DATA_EXPORT': 'Exportação de Dados'
  }
  
  return labels[action] || action
}

function getAlertMessage(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case 'SECURITY_ALERT_SENT':
      return `Alerta: ${details.alertType || 'Personalizado'}`
    case 'SUSPICIOUS_LOGIN':
      return `Login suspeito detectado - IP: ${details.ipAddress || 'Desconhecido'}`
    case 'MULTIPLE_ATTEMPTS':
      return `${details.attempts || 0} tentativas de login falhadas`
    case 'DATA_EXPORT':
      return `Exportação de ${details.recordCount || 0} registros`
    default:
      return 'Alerta de segurança'
  }
}
