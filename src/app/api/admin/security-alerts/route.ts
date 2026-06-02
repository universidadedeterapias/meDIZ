// src/app/api/admin/security-alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { 
  sendSecurityAlert, 
  isWhatsAppConfigured,
  simulateWhatsAppSend
} from '@/lib/whatsappService'
import { logSecurityAlert } from '@/lib/auditLogger'
import { logDebug, logWarn, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      logWarn('Tentativa de acesso não autorizado à API de security alerts', 'SecurityAlertsAPI', {
        hasSession: !!session,
        userEmail: session?.user?.email
      })
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
      logDebug('Buscando admin por ID', 'SecurityAlertsAPI', { targetAdminId })
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
      
      // Se não encontrou, tentar busca case-insensitive
      if (!targetAdmin) {
        const users = await prisma.user.findMany({
          where: {
            email: {
              equals: session.user.email,
              mode: 'insensitive'
            }
          },
          select: { id: true, name: true, email: true, whatsapp: true }
        })
        targetAdmin = users[0] || null
      }
    }

    if (!targetAdmin) {
      logError('Admin não encontrado', undefined, 'SecurityAlertsAPI', {
        sessionEmail: session?.user?.email,
        targetAdminId
      })
      return NextResponse.json({ 
        error: `Admin não encontrado. Verifique se você está logado com um email @mediz.com. Email atual: ${session?.user?.email || 'não logado'}` 
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

    // Registrar no audit log
    try {
      const currentAdmin = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })

      if (currentAdmin) {
        await logSecurityAlert(
          currentAdmin.id,
          session.user.email,
          alertType,
          {
            targetAdminId: targetAdmin.id,
            targetAdminEmail: targetAdmin.email,
            details,
            whatsappSent: sent
          },
          req
        )
      }
    } catch (auditError) {
      logError('Erro ao registrar no audit log', auditError as Error, 'SecurityAlertsAPI')
      // Não falhar a operação principal por causa do audit log
    }

    return NextResponse.json({
      success: true,
      message: 'Alerta de segurança enviado com sucesso'
    })

  } catch (error) {
    logError('Erro na API de security alerts', error as Error, 'SecurityAlertsAPI')
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

