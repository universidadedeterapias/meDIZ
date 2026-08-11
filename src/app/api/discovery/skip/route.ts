import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Saída de emergência do gate de descoberta.
 *
 * Depois que a pessoa aceita o consentimento, o "Agora não" da tela some e o
 * único jeito de liberar o /chat passa a ser concluir a descoberta — se a voz
 * não conectar, se o agente nunca encerrar a conversa ou se a conclusão falhar,
 * ela fica presa no laço /chat → /descoberta. Este endpoint marca a descoberta
 * como resolvida para o usuário logado, sem gravar transcript nem evento: é
 * abandono do fluxo, não conclusão.
 */
export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        discoveryCompleted: true
      },
      update: {
        discoveryCompleted: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Discovery Skip] Falha ao liberar o usuário do gate:', error)
    return NextResponse.json(
      { error: 'Não foi possível sair da descoberta agora' },
      { status: 500 }
    )
  }
}
