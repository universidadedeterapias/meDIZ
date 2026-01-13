import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para registrar subscription de push notifications
 * IMPORTANTE: Disponível para TODOS os usuários autenticados (gratuitos e premium)
 * Não há verificação de assinatura/premium - notificações são para todos
 */
export async function POST(req: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development'
  const log = (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`[PUSH-SUBSCRIBE] ${new Date().toISOString()} - ${message}`, data || '')
    }
  }

  try {
    log('========== INÍCIO REGISTRO DE SUBSCRIPTION ==========')

    log('1️⃣ Verificando autenticação...')
    const session = await auth()

    if (!session?.user?.id) {
      log('❌ Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    log('✅ Usuário autenticado')

    // Não há verificação de assinatura/premium aqui
    // Todos os usuários autenticados podem se inscrever em notificações push

    log('2️⃣ Lendo body da requisição...')
    const body = await req.json()
    const { endpoint, keys, userAgent } = body

    log('📋 Dados recebidos', {
      hasEndpoint: !!endpoint,
      hasKeys: !!keys,
      hasP256dh: !!keys?.p256dh,
      hasAuth: !!keys?.auth
      // Não logar endpoint, chaves p256dh e auth por segurança
    })

    // Validação
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      log('❌ Dados inválidos', {
        endpoint: !!endpoint,
        keys: !!keys,
        p256dh: !!keys?.p256dh,
        auth: !!keys?.auth
      })
      return NextResponse.json(
        { error: 'Dados de subscription inválidos' },
        { status: 400 }
      )
    }

    log('3️⃣ Verificando se subscription já existe...')
    // Verificar se já existe subscription com este endpoint
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (existing) {
      log('✅ Subscription existente encontrada', {
        id: existing.id,
        userId: existing.userId,
        currentUserId: session.user.id
      })

      // Se a subscription pertence a outro usuário, deletar e criar nova
      if (existing.userId !== session.user.id) {
        log('⚠️ Subscription pertence a outro usuário, deletando e criando nova...')
        await prisma.pushSubscription.delete({
          where: { endpoint }
        })
        log('✅ Subscription antiga deletada')
        // Continuar para criar nova subscription abaixo
      } else {
        // Atualizar subscription existente do mesmo usuário
        log('4️⃣ Atualizando subscription existente...')
        const updated = await prisma.pushSubscription.update({
          where: { endpoint },
          data: {
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: userAgent || null,
            updatedAt: new Date()
          }
        })

        log('✅ Subscription atualizada com sucesso', {
          id: updated.id,
          userId: updated.userId
        })
        log('========== FIM REGISTRO (ATUALIZAÇÃO) ==========')

        return NextResponse.json({
          success: true,
          message: 'Subscription atualizada',
          id: updated.id
        })
      }
    }

    // Criar nova subscription
    log('4️⃣ Criando nova subscription...')
    const subscription = await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null
      }
    })

    log('✅ Nova subscription criada com sucesso', {
      id: subscription.id
      // Não logar userId, endpoint ou chaves por segurança
    })
    log('========== FIM REGISTRO (CRIAÇÃO) ==========')

    return NextResponse.json({
      success: true,
      message: 'Subscription registrada com sucesso',
      id: subscription.id
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    log('❌ ERRO CRÍTICO:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined
    })
    console.error('Erro ao registrar subscription:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao registrar subscription',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

