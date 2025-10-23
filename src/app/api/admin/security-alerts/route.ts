// src/app/api/admin/security-alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { 
  sendSecurityAlert, 
  sendSuspiciousLoginAlert, 
  sendMultipleLoginAttemptsAlert,
  sendDataExportAlert,
  isWhatsAppConfigured,
  simulateWhatsAppSend
} from '@/lib/whatsappService'
import { logAuditAction, AuditResources } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { alertType, details, targetAdminId } = await req.json()

    if (!alertType || !details) {
      return NextResponse.json({ 
        error: 'Tipo de alerta e detalhes são obrigatórios' 
      }, { status: 400 })
    }

    // Buscar admin que vai receber o alerta
    let targetAdmin = null
    if (targetAdminId) {
      targetAdmin = await prisma.user.findUnique({
        where: { id: targetAdminId },
        select: { id: true, name: true, email: true, whatsapp: true }
      })
    } else {
      // Se não especificado, buscar o admin atual
      targetAdmin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, whatsapp: true }
      })
    }

    if (!targetAdmin) {
      return NextResponse.json({ 
        error: 'Admin não encontrado' 
      }, { status: 404 })
    }

    if (!targetAdmin.whatsapp) {
      return NextResponse.json({ 
        error: 'Admin não tem WhatsApp cadastrado' 
      }, { status: 400 })
    }

    // Enviar alerta via WhatsApp
    let sent = false

    if (isWhatsAppConfigured()) {
      sent = await sendSecurityAlert(targetAdmin.whatsapp, alertType, details)
    } else {
      // Modo de desenvolvimento - simular envio
      simulateWhatsAppSend(targetAdmin.whatsapp, `ALERTA: ${alertType} - ${details}`)
      sent = true
    }

    if (!sent) {
      return NextResponse.json({ 
        error: 'Erro ao enviar alerta via WhatsApp' 
      }, { status: 500 })
    }

    // Registrar no audit log (se a tabela existir)
    try {
      const currentAdmin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })

      if (currentAdmin) {
        await logAuditAction({
          adminId: currentAdmin.id,
          adminEmail: session.user.email,
          action: 'SECURITY_ALERT_SENT',
          resource: AuditResources.AUTH,
          details: {
            alertType,
            targetAdminId: targetAdmin.id,
            targetAdminEmail: targetAdmin.email,
            details
          },
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        })
      }
    } catch (auditError) {
      console.log('[Security Alerts API] Audit log não disponível:', auditError.message)
      // Não falhar a operação principal por causa do audit log
    }

    return NextResponse.json({
      success: true,
      message: 'Alerta de segurança enviado com sucesso'
    })

  } catch (error) {
    console.error('[Security Alerts API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Funções específicas para diferentes tipos de alertas
export async function sendSuspiciousLoginNotification(adminId: string, ipAddress: string, userAgent: string) {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, whatsapp: true }
    })

    if (!admin || !admin.whatsapp) return false

    const _adminName = admin.name || 'Admin'
    let sent = false

    if (isWhatsAppConfigured()) {
      sent = await sendSuspiciousLoginAlert(admin.whatsapp, _adminName, ipAddress, userAgent)
    } else {
      simulateWhatsAppSend(admin.whatsapp, `LOGIN SUSPEITO: IP ${ipAddress}`)
      sent = true
    }

    return sent
  } catch (error) {
    console.error('[Suspicious Login Alert] Erro:', error)
    return false
  }
}

export async function sendMultipleAttemptsNotification(adminId: string, attempts: number, ipAddress: string) {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, whatsapp: true }
    })

    if (!admin || !admin.whatsapp) return false

    const _adminName = admin.name || 'Admin'
    let sent = false

    if (isWhatsAppConfigured()) {
      sent = await sendMultipleLoginAttemptsAlert(admin.whatsapp, _adminName, attempts, ipAddress)
    } else {
      simulateWhatsAppSend(admin.whatsapp, `MÚLTIPLAS TENTATIVAS: ${attempts} tentativas de IP ${ipAddress}`)
      sent = true
    }

    return sent
  } catch (error) {
    console.error('[Multiple Attempts Alert] Erro:', error)
    return false
  }
}

export async function sendDataExportNotification(adminId: string, exportType: string, recordCount: number) {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, whatsapp: true }
    })

    if (!admin || !admin.whatsapp) return false

    const adminName = admin.name || 'Admin'
    let sent = false

    if (isWhatsAppConfigured()) {
      sent = await sendDataExportAlert(admin.whatsapp, adminName, exportType, recordCount)
    } else {
      simulateWhatsAppSend(admin.whatsapp, `EXPORTAÇÃO: ${exportType} - ${recordCount} registros`)
      sent = true
    }

    return sent
  } catch (error) {
    console.error('[Data Export Alert] Erro:', error)
    return false
  }
}
