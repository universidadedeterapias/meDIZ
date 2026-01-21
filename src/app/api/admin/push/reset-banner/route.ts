import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para resetar o estado de notificações e forçar o banner aparecer novamente
 * APENAS PARA ADMINS
 * 
 * POST /api/admin/push/reset-banner
 * 
 * Isso reseta notificationsEnabled = false para todos os usuários com subscriptions ativas,
 * fazendo o banner de notificações aparecer novamente
 */
export async function POST(_req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const isAdmin = session.user.email?.includes('@mediz.com') || false

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem resetar o banner' },
        { status: 403 }
      )
    }

    console.log('[RESET-BANNER] Iniciando reset de notificações...')
    console.log('[RESET-BANNER] Admin:', session.user.email)

    // Buscar todos os usuários que têm subscriptions ativas
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          some: {} // Tem pelo menos uma subscription
        }
      },
      select: {
        id: true,
        notificationsEnabled: true
      }
    })

    console.log(`[RESET-BANNER] Total de usuários com subscriptions: ${usersWithSubscriptions.length}`)

    if (usersWithSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum usuário encontrado com subscriptions ativas',
        totalUsers: 0,
        updated: 0
      })
    }

    // Resetar notificationsEnabled para false
    const updateResult = await prisma.user.updateMany({
      where: {
        id: {
          in: usersWithSubscriptions.map(u => u.id)
        }
      },
      data: {
        notificationsEnabled: false
      }
    })

    console.log(`[RESET-BANNER] Reset concluído: ${updateResult.count} usuários atualizados`)

    return NextResponse.json({
      success: true,
      message: 'Banner de notificações resetado com sucesso',
      totalUsers: usersWithSubscriptions.length,
      updated: updateResult.count,
      note: 'O banner aparecerá novamente para esses usuários quando acessarem o app'
    })

  } catch (error) {
    console.error('[RESET-BANNER] Erro:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao resetar banner' 
      },
      { status: 500 }
    )
  }
}
