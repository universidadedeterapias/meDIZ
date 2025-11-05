// src/app/api/admin/audit-logs/login-failed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logLogin, logMultipleAttempts } from '@/lib/auditLogger'
import { prisma } from '@/lib/prisma'
import { sendMultipleLoginAttemptsAlert } from '@/lib/whatsappService'
import { isIPBlocked, recordFailedAttempt } from '@/lib/ipBlocker'
import { rateLimitMiddleware } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    // Verificar se IP está bloqueado
    if (await isIPBlocked(ipAddress)) {
      return NextResponse.json({ 
        error: 'IP bloqueado devido a múltiplas tentativas de login. Tente novamente em 15 minutos.',
        blocked: true
      }, { status: 429 })
    }
    
    // Aplicar rate limiting por email
    const rateLimitResponse = await rateLimitMiddleware(req, email)
    if (rateLimitResponse) {
      // Registrar tentativa bloqueada
      await recordFailedAttempt(ipAddress)
      return rateLimitResponse
    }
    
    // Registrar tentativa falhada (pode bloquear IP)
    const shouldBlock = await recordFailedAttempt(ipAddress)
    if (shouldBlock) {
      // Se deve bloquear, retornar erro
      return NextResponse.json({ 
        error: 'Muitas tentativas de login. IP bloqueado por 15 minutos.',
        blocked: true
      }, { status: 429 })
    }
    
    // Buscar admin no banco (pode não existir se for tentativa de login inválida)
    const admin = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, whatsapp: true, email: true }
    })

    // Verificar se é admin pelo email
    const isAdmin = admin?.email.includes('@mediz.com') ?? false

    if (admin && isAdmin) {
      // Registrar login falhado no audit log
      await logLogin(admin.id, email, req, false)
      
      // Verificar se há múltiplas tentativas recentes
      const recentAttempts = await prisma.auditLog.count({
        where: {
          adminId: admin.id,
          action: 'LOGIN_FAILED',
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Últimos 15 minutos
          }
        }
      })
      
      // Se há 3 ou mais tentativas, enviar alerta automático
      if (recentAttempts >= 3) {
        // Registrar no audit log
        await logMultipleAttempts(admin.id, email, recentAttempts, ipAddress)
        
        // Enviar alerta via WhatsApp se configurado
        if (admin.whatsapp) {
          try {
            await sendMultipleLoginAttemptsAlert(
              admin.whatsapp,
              admin.name || 'Admin',
              recentAttempts,
              ipAddress
            )
          } catch {
            // Não falhar o fluxo principal se o alerta falhar
            // Log será feito pelo sistema de logs estruturado
          }
        }
      }
    } else {
      // Registrar tentativa de login com email inexistente
      await logLogin('unknown', email, req, false)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tentativa de login registrada'
    })

  } catch {
    // Usar sistema de logs estruturado (será implementado)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
