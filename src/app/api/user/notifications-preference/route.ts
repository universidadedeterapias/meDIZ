import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API simples para salvar preferência de notificações do usuário
 */
export async function POST(req: NextRequest) {
  console.log('[notifications-preference] ====== INÍCIO POST ======')
  
  try {
    console.log('[notifications-preference] 1. Verificando autenticação...')
    const session = await auth()
    console.log('[notifications-preference] Session:', {
      hasSession: !!session,
      userId: session?.user?.id
      // Não logar email por segurança
    })

    if (!session?.user?.id) {
      console.log('[notifications-preference] ❌ Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log('[notifications-preference] 2. Lendo body da requisição...')
    const body = await req.json()
    console.log('[notifications-preference] Body recebido:', body)
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      console.log('[notifications-preference] ❌ Valor inválido:', typeof enabled, enabled)
      return NextResponse.json(
        { error: 'Valor inválido. Use true ou false' },
        { status: 400 }
      )
    }

    console.log('[notifications-preference] 3. Verificando se usuário existe...')
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, notificationsEnabled: true }
    })

    if (!existingUser) {
      console.log('[notifications-preference] ❌ Usuário não encontrado no banco')
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    console.log('[notifications-preference] Usuário encontrado:', existingUser)
    console.log('[notifications-preference] 4. Atualizando preferência no banco...')
    console.log('[notifications-preference] UserId:', session.user.id)
    console.log('[notifications-preference] Enabled:', enabled)

    // Atualizar preferência do usuário
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationsEnabled: enabled },
      select: { id: true, email: true, notificationsEnabled: true }
    })

    console.log('[notifications-preference] ✅ Usuário atualizado:', updatedUser)
    console.log('[notifications-preference] ====== FIM POST (sucesso) ======')

    return NextResponse.json({
      success: true,
      message: enabled ? 'Notificações ativadas' : 'Notificações desativadas'
    })
  } catch (error) {
    console.error('[notifications-preference] ❌ ERRO:', error)
    console.error('[notifications-preference] Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[notifications-preference] Mensagem:', error instanceof Error ? error.message : String(error))
    console.error('[notifications-preference] Stack:', error instanceof Error ? error.stack : 'N/A')
    console.log('[notifications-preference] ====== FIM POST (erro) ======')
    
    return NextResponse.json(
      { 
        error: 'Erro ao salvar preferência',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Obter preferência de notificações do usuário
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationsEnabled: true }
    })

    return NextResponse.json({
      enabled: user?.notificationsEnabled ?? false
    })
  } catch (error) {
    console.error('Erro ao buscar preferência de notificações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar preferência' },
      { status: 500 }
    )
  }
}


