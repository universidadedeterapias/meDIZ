import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/webPush'

/**
 * API para enviar notificação push única para todos os usuários com subscriptions ativas
 * APENAS PARA ADMINS
 * 
 * POST /api/admin/push/broadcast
 * Body (opcional): { title, body } - customiza a mensagem
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
        { error: 'Apenas administradores podem enviar broadcast' },
        { status: 403 }
      )
    }

    // Ler body opcional para customizar mensagem
    let customTitle = '🔔 meDIZ - Notificações Ativadas!'
    let customBody = 'As notificações de lembretes estão funcionando normalmente. Você receberá seus lembretes personalizados no horário agendado!'

    try {
      const body = await req.json().catch(() => ({}))
      if (body.title) customTitle = body.title
      if (body.body) customBody = body.body
    } catch {
      // Usar valores padrão se body não for válido
    }

    console.log('[BROADCAST] Iniciando envio de notificação para todos os usuários...')
    console.log('[BROADCAST] Admin:', session.user.email)

    // Buscar todos os usuários que têm subscriptions ativas
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          some: {} // Tem pelo menos uma subscription
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        pushSubscriptions: {
          select: {
            id: true
          }
        }
      }
    })

    console.log(`[BROADCAST] Total de usuários com subscriptions: ${usersWithSubscriptions.length}`)

    if (usersWithSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum usuário encontrado com subscriptions ativas',
        totalUsers: 0,
        sent: 0,
        failed: 0
      })
    }

    // Processar em batches de 50 usuários por vez
    const BATCH_SIZE = 50
    let totalSent = 0
    let totalFailed = 0
    const errors: string[] = []

    for (let i = 0; i < usersWithSubscriptions.length; i += BATCH_SIZE) {
      const batch = usersWithSubscriptions.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(usersWithSubscriptions.length / BATCH_SIZE)

      console.log(`[BROADCAST] Processando batch ${batchNumber}/${totalBatches} (${batch.length} usuários)...`)

      // Processar batch em paralelo
      const batchPromises = batch.map(async (user) => {
        try {
          const result = await sendPushNotification(user.id, {
            title: customTitle,
            body: customBody,
            icon: '/imgs/logo192.png',
            badge: '/imgs/logo192.png',
            tag: 'mediz-broadcast',
            data: {
              type: 'broadcast',
              url: '/'
            },
            url: '/'
          })

          if (result.success > 0) {
            return { success: true, sent: result.success, failed: result.failed }
          } else {
            return { success: false, sent: 0, failed: result.failed, errors: result.errors }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          return { success: false, sent: 0, failed: 1, errors: [errorMessage] }
        }
      })

      // Aguardar batch completar
      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            totalSent += result.value.sent
            totalFailed += result.value.failed
          } else {
            totalFailed += result.value.failed
            if (result.value.errors) {
              errors.push(...result.value.errors)
            }
          }
        } else {
          totalFailed++
          errors.push(result.reason?.toString() || 'Erro desconhecido')
        }
      })

      // Pequeno delay entre batches
      if (i + BATCH_SIZE < usersWithSubscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`[BROADCAST] Concluído: ${totalSent} enviadas, ${totalFailed} falhas`)

    return NextResponse.json({
      success: true,
      message: 'Notificações enviadas com sucesso',
      totalUsers: usersWithSubscriptions.length,
      sent: totalSent,
      failed: totalFailed,
      successRate: ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2) + '%',
      errors: errors.slice(0, 10) // Limitar a 10 erros na resposta
    })

  } catch (error) {
    console.error('[BROADCAST] Erro:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar broadcast' 
      },
      { status: 500 }
    )
  }
}
