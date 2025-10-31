import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * API otimizada para carregar apenas os dados necessários da sidebar
 * Reduz significativamente o tempo de carregamento ao buscar apenas campos essenciais
 */
export async function GET() {
  const requestStart = Date.now()
  console.log('[API /user/sidebar] 🌐 Request recebido')
  const session = await auth()

  console.log('[API /user/sidebar] 📋 Session:', session ? { 
    hasUser: !!session.user, 
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    sessionComplete: !!(session?.user?.id && session?.user?.email)
  } : 'null')

  if (!session?.user?.id) {
    console.log('[API /user/sidebar] ❌ Não autenticado, retornando 401')
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    console.log('[API /user/sidebar] Buscando usuário no banco:', session.user.id)
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

    console.log('[API /user/sidebar] Usuário encontrado:', user ? { id: user.id, name: user.name, email: user.email } : 'null')

    if (!user) {
      console.log('[API /user/sidebar] ❌ Usuário não encontrado no banco')
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const duration = Date.now() - requestStart
    console.log('[API /user/sidebar] ✅ Retornando dados do usuário após', duration, 'ms')
    return NextResponse.json(user)
  } catch (error) {
    const duration = Date.now() - requestStart
    console.error('[API /user/sidebar] ❌ Erro ao buscar dados após', duration, 'ms:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Erro ao buscar os dados do usuário' },
      { status: 500 }
    )
  }
}
