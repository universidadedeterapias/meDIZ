import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logAuditAction, AuditActions, AuditResources } from '@/lib/auditLogger'

// Função para extrair informações da requisição
function extractRequestInfo(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  return { ipAddress, userAgent }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { userId, newPassword } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const userToReset = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToReset) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(newPassword || 'mediz123', 10)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword }
    })

    const { ipAddress, userAgent } = extractRequestInfo(req)
    await logAuditAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: AuditActions.PASSWORD_RESET,
      resource: AuditResources.USER,
      resourceId: userId,
      details: {
        resetBy: session.user.email,
        targetUserEmail: userToReset.email,
        isDefaultPassword: !newPassword
      },
      ipAddress,
      userAgent
    })

    return NextResponse.json({
      success: true,
      message: `Senha do usuário ${userToReset.email} resetada com sucesso. Nova senha: ${newPassword || 'mediz123'}`
    })

  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}