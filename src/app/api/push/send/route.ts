import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendPushNotification } from '@/lib/webPush'

/**
 * API para enviar notificações push (apenas para admins)
 */
export async function POST(req: NextRequest) {
  try {
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
        { error: 'Apenas administradores podem enviar notificações' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { userId, title, body: message, icon, badge, tag, data, url, requireInteraction } = body

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'userId, title e body são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await sendPushNotification(userId, {
      title,
      body: message,
      icon,
      badge,
      tag,
      data,
      url,
      requireInteraction
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar notificação' },
      { status: 500 }
    )
  }
}






