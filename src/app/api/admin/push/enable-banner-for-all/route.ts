import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para forçar o banner aparecer para TODOS os usuários sem subscription
 * APENAS PARA ADMINS
 * 
 * POST /api/admin/push/enable-banner-for-all
 * Body (opcional): 
 *   - { target: "no-subscription" | "all" } - "no-subscription" (padrão) = apenas sem subscription, "all" = todos
 *   - { force: true } - se true, força mesmo para quem tem notificationsEnabled = false
 * 
 * Isso garante que notificationsEnabled = false para usuários sem subscription,
 * fazendo o banner de notificações aparecer quando eles acessarem o app
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
        { error: 'Apenas administradores podem habilitar o banner' },
        { status: 403 }
      )
    }

    // Ler body opcional
    let target = 'no-subscription' // 'no-subscription' ou 'all'
    let force = false
    try {
      const body = await req.json().catch(() => ({}))
      target = body.target === 'all' ? 'all' : 'no-subscription'
      force = body.force === true
    } catch {
      // Usar valores padrão se body não for válido
    }

    console.log('[ENABLE-BANNER] Iniciando habilitação de banner...')
    console.log('[ENABLE-BANNER] Admin:', session.user.email)
    console.log('[ENABLE-BANNER] Target:', target)
    console.log('[ENABLE-BANNER] Force:', force)

    // Buscar usuários baseado no target
    let usersToUpdate: Array<{ id: string; email: string | null; notificationsEnabled: boolean; subscriptionCount: number }> = []

    if (target === 'no-subscription') {
      // Buscar usuários SEM subscription
      const usersWithoutSubscriptions = await prisma.user.findMany({
        where: {
          pushSubscriptions: {
            none: {} // Não tem nenhuma subscription
          }
        },
        select: {
          id: true,
          email: true,
          notificationsEnabled: true,
          pushSubscriptions: {
            select: {
              id: true
            }
          }
        }
      })

      usersToUpdate = usersWithoutSubscriptions.map(u => ({
        id: u.id,
        email: u.email,
        notificationsEnabled: u.notificationsEnabled,
        subscriptionCount: u.pushSubscriptions.length
      }))

      console.log(`[ENABLE-BANNER] Total de usuários SEM subscription: ${usersToUpdate.length}`)
    } else {
      // Buscar TODOS os usuários
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          notificationsEnabled: true,
          pushSubscriptions: {
            select: {
              id: true
            }
          }
        }
      })

      usersToUpdate = allUsers.map(u => ({
        id: u.id,
        email: u.email,
        notificationsEnabled: u.notificationsEnabled,
        subscriptionCount: u.pushSubscriptions.length
      }))

      console.log(`[ENABLE-BANNER] Total de usuários: ${usersToUpdate.length}`)
    }

    if (usersToUpdate.length === 0) {
      return NextResponse.json({
        success: false,
        message: target === 'no-subscription' 
          ? 'Nenhum usuário encontrado sem subscription'
          : 'Nenhum usuário encontrado',
        totalUsers: 0,
        updated: 0,
        alreadyEnabled: 0
      })
    }

    // Filtrar usuários que precisam ser atualizados
    let usersNeedingUpdate = usersToUpdate

    if (!force) {
      // Se não for force, atualizar apenas quem tem notificationsEnabled = true
      // (estado inconsistente: enabled mas sem subscription)
      usersNeedingUpdate = usersToUpdate.filter(u => u.notificationsEnabled === true)
      console.log(`[ENABLE-BANNER] Usuários que precisam atualização (notificationsEnabled = true): ${usersNeedingUpdate.length}`)
    } else {
      // Se for force, atualizar todos (garantir que todos estão com false)
      console.log(`[ENABLE-BANNER] Modo FORCE: atualizando todos os ${usersToUpdate.length} usuários`)
    }

    const alreadyEnabled = usersToUpdate.length - usersNeedingUpdate.length

    if (usersNeedingUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário precisa ser atualizado. Todos já estão com notificationsEnabled = false',
        totalUsers: usersToUpdate.length,
        updated: 0,
        alreadyEnabled: alreadyEnabled,
        note: 'O banner já deve aparecer para esses usuários quando acessarem o app'
      })
    }

    // Atualizar notificationsEnabled para false
    const updateResult = await prisma.user.updateMany({
      where: {
        id: {
          in: usersNeedingUpdate.map(u => u.id)
        }
      },
      data: {
        notificationsEnabled: false
      }
    })

    console.log(`[ENABLE-BANNER] Reset concluído: ${updateResult.count} usuários atualizados`)

    // Estatísticas detalhadas
    const stats = {
      totalUsers: usersToUpdate.length,
      withoutSubscriptions: usersToUpdate.filter(u => u.subscriptionCount === 0).length,
      withSubscriptions: usersToUpdate.filter(u => u.subscriptionCount > 0).length,
      updated: updateResult.count,
      alreadyEnabled: alreadyEnabled
    }

    return NextResponse.json({
      success: true,
      message: `Banner habilitado para ${updateResult.count} usuário(s)`,
      stats: stats,
      note: target === 'no-subscription'
        ? 'O banner aparecerá para usuários sem subscription quando acessarem o app (páginas /chat ou /)'
        : 'O banner aparecerá para todos os usuários quando acessarem o app (páginas /chat ou /)'
    })

  } catch (error) {
    console.error('[ENABLE-BANNER] Erro:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao habilitar banner' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Retorna estatísticas de usuários sem subscription
 */
export async function GET() {
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
        { error: 'Apenas administradores podem ver estatísticas' },
        { status: 403 }
      )
    }

    // Buscar estatísticas
    const usersWithoutSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          none: {}
        }
      },
      select: {
        id: true,
        notificationsEnabled: true
      }
    })

    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          some: {}
        }
      },
      select: {
        id: true,
        notificationsEnabled: true
      }
    })

    const stats = {
      totalUsers: usersWithoutSubscriptions.length + usersWithSubscriptions.length,
      withoutSubscriptions: {
        total: usersWithoutSubscriptions.length,
        notificationsEnabledTrue: usersWithoutSubscriptions.filter(u => u.notificationsEnabled === true).length,
        notificationsEnabledFalse: usersWithoutSubscriptions.filter(u => u.notificationsEnabled === false).length
      },
      withSubscriptions: {
        total: usersWithSubscriptions.length,
        notificationsEnabledTrue: usersWithSubscriptions.filter(u => u.notificationsEnabled === true).length,
        notificationsEnabledFalse: usersWithSubscriptions.filter(u => u.notificationsEnabled === false).length
      }
    }

    return NextResponse.json({
      success: true,
      stats: stats,
      note: 'Usuários sem subscription com notificationsEnabled = true precisam ser resetados para ver o banner'
    })

  } catch (error) {
    console.error('[ENABLE-BANNER] Erro:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar estatísticas' 
      },
      { status: 500 }
    )
  }
}
