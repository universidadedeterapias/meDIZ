import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para resetar o estado de notificações e forçar o banner aparecer novamente
 * APENAS PARA ADMINS
 * 
 * POST /api/admin/push/reset-banner
 * Body (opcional): { deleteSubscriptions: true } - se true, também deleta as subscriptions
 * 
 * Isso reseta notificationsEnabled = false para todos os usuários com subscriptions ativas,
 * fazendo o banner de notificações aparecer novamente
 */
export async function POST(req: NextRequest) {
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

    // Ler body opcional
    let deleteSubscriptions = false
    try {
      const body = await req.json().catch(() => ({}))
      deleteSubscriptions = body.deleteSubscriptions === true
    } catch {
      // Usar valor padrão se body não for válido
    }

    console.log('[RESET-BANNER] Iniciando reset de notificações...')
    console.log('[RESET-BANNER] Admin:', session.user.email)
    console.log('[RESET-BANNER] Deletar subscriptions:', deleteSubscriptions)

    // Buscar todos os usuários que têm subscriptions ativas
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          some: {} // Tem pelo menos uma subscription
        }
      },
      select: {
        id: true,
        notificationsEnabled: true,
        pushSubscriptions: {
          select: {
            id: true
          }
        }
      }
    })

    console.log(`[RESET-BANNER] Total de usuários com subscriptions: ${usersWithSubscriptions.length}`)

    if (usersWithSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum usuário encontrado com subscriptions ativas',
        totalUsers: 0,
        updated: 0,
        deletedSubscriptions: 0
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

    let deletedCount = 0
    // Se solicitado, também deletar as subscriptions
    if (deleteSubscriptions) {
      const allSubscriptionIds = usersWithSubscriptions.flatMap(u => 
        u.pushSubscriptions.map(s => s.id)
      )
      
      const deleteResult = await prisma.pushSubscription.deleteMany({
        where: {
          id: {
            in: allSubscriptionIds
          }
        }
      })
      
      deletedCount = deleteResult.count
      console.log(`[RESET-BANNER] ${deletedCount} subscriptions deletadas`)
    }

    console.log(`[RESET-BANNER] Reset concluído: ${updateResult.count} usuários atualizados`)

    return NextResponse.json({
      success: true,
      message: deleteSubscriptions 
        ? 'Banner resetado e subscriptions deletadas com sucesso'
        : 'Banner de notificações resetado com sucesso',
      totalUsers: usersWithSubscriptions.length,
      updated: updateResult.count,
      deletedSubscriptions: deletedCount,
      note: deleteSubscriptions
        ? 'O banner aparecerá novamente. As subscriptions antigas foram deletadas, então os usuários precisarão criar novas.'
        : 'O banner aparecerá novamente para esses usuários quando acessarem o app. As subscriptions antigas foram mantidas.'
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
