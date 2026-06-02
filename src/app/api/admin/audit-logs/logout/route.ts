// src/app/api/admin/audit-logs/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logLogout } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Buscar admin no banco
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    // Registrar logout no audit log
    await logLogout(admin.id, session.user.email, req)

    return NextResponse.json({ 
      success: true, 
      message: 'Logout registrado com sucesso'
    })

  } catch (error) {
    console.error('[Audit Logout API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
