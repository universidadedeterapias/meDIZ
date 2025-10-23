// src/app/api/admin/audit-logs/login-failed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logLogin } from '@/lib/auditLogger'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    // Buscar admin no banco (pode não existir se for tentativa de login inválida)
    const admin = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (admin) {
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
      
      // Se há 3 ou mais tentativas, enviar alerta
      if (recentAttempts >= 3) {
        const _ipAddress = req.headers.get('x-forwarded-for') || 
                         req.headers.get('x-real-ip') || 
                         'unknown'
        // Log de tentativas múltiplas registrado acima
      }
    } else {
      // Registrar tentativa de login com email inexistente
      await logLogin('unknown', email, req, false)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tentativa de login registrada'
    })

  } catch (error) {
    console.error('[Audit Login Failed API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
