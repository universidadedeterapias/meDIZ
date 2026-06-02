// src/app/api/admin/audit-logs/login-success/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { logLogin } from '@/lib/auditLogger'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    // Buscar admin no banco
    const admin = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    // Registrar login bem-sucedido no audit log
    await logLogin(admin.id, email, req, true)

    return NextResponse.json({ 
      success: true, 
      message: 'Login registrado com sucesso'
    })

  } catch (error) {
    console.error('[Audit Login Success API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
