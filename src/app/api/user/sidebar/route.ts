import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * API otimizada para carregar apenas os dados necessários da sidebar
 * Reduz significativamente o tempo de carregamento ao buscar apenas campos essenciais
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        fullName: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao buscar dados do usuário para sidebar:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar os dados do usuário' },
      { status: 500 }
    )
  }
}
