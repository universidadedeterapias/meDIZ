// app/api/folders/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
import { NextResponse } from 'next/server'

// GET - Listar todas as pastas do usuário
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const folders = await prisma.symptomFolder.findMany({
      where: { userId: session.user.id },
      include: {
        symptoms: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, symptom: true, threadId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('[API Folders] Erro ao listar pastas:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const _errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Erro ao carregar pastas',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Criar nova pasta
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar se é premium (obrigatório para criar pastas)
  const isPremium = await isUserPremium(session.user.id)
  if (!isPremium) {
    return NextResponse.json({ error: 'Funcionalidade disponível apenas para usuários premium' }, { status: 403 })
  }

  const { name, color, notes } = await req.json()

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nome da pasta é obrigatório' }, { status: 400 })
  }

  const folderData = {
    userId: session.user.id,
    name: name.trim(),
    color: color || null,
    notes: typeof notes === 'string' && notes.trim().length > 0 
      ? notes.trim() 
      : null
  }

  const folder = await prisma.symptomFolder.create({
    data: folderData
  })

  return NextResponse.json(folder)
}

