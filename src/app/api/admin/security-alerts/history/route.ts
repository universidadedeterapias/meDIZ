// src/app/api/admin/security-alerts/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ 
        success: false,
        error: 'Não autorizado' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Buscar logs de alertas de segurança da tabela audit_logs
    const [alertsResult, totalResult] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: {
            in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS', 'DATA_EXPORT', 'INJECTION_SQL_INJECTION_DETECTED', 'INJECTION_COMMAND_INJECTION_DETECTED']
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({
        where: {
          action: {
            in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS', 'DATA_EXPORT', 'INJECTION_SQL_INJECTION_DETECTED', 'INJECTION_COMMAND_INJECTION_DETECTED']
          }
        }
      })
    ])
    
    const alerts = alertsResult || []
    const total = totalResult || 0

    // Formatar dados com tratamento de erros
    const formattedAlerts = alerts.map(alert => {
      let details = {}
      try {
        details = alert.details ? (typeof alert.details === 'string' ? JSON.parse(alert.details) : alert.details) : {}
      } catch (parseError) {
        console.warn('[Security Alerts History API] Erro ao parsear details:', parseError)
        details = {}
      }
      
      // Garantir que timestamp seja válido
      let timestamp: string
      try {
        if (alert.timestamp instanceof Date) {
          timestamp = alert.timestamp.toISOString()
        } else {
          timestamp = new Date(alert.timestamp).toISOString()
        }
      } catch {
        timestamp = new Date().toISOString()
      }
      
      return {
        id: alert.id,
        type: getAlertTypeLabel(alert.action),
        message: getAlertMessage(alert.action, details),
        sent: true, // Assumindo que se está no log, foi enviado
        timestamp,
        adminName: alert.adminEmail?.split('@')[0] || 'Admin', // Usar parte do email como nome
        adminEmail: alert.adminEmail || '',
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
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      alerts: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    }, { status: 500 })
  }
}

function getAlertTypeLabel(action: string): string {
  const labels: Record<string, string> = {
    'SECURITY_ALERT_SENT': 'Alerta Personalizado',
    'SUSPICIOUS_LOGIN': 'Login Suspeito',
    'MULTIPLE_ATTEMPTS': 'Múltiplas Tentativas',
    'DATA_EXPORT': 'Exportação de Dados',
    'INJECTION_SQL_INJECTION_DETECTED': 'SQL Injection',
    'INJECTION_COMMAND_INJECTION_DETECTED': 'Command Injection'
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
    case 'INJECTION_SQL_INJECTION_DETECTED':
      return `SQL Injection detectada - Endpoint: ${details.endpoint || 'desconhecido'}`
    case 'INJECTION_COMMAND_INJECTION_DETECTED':
      return `Command Injection detectada - Endpoint: ${details.endpoint || 'desconhecido'}`
    default:
      return 'Alerta de segurança'
  }
}
