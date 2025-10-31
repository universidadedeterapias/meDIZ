// app/api/folders/[id]/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
import { NextResponse } from 'next/server'

// PUT - Renomear pasta ou atualizar notas
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar premium antes de atualizar
    const isPremium = await isUserPremium(session.user.id)
    if (!isPremium) {
      return NextResponse.json({ error: 'Funcionalidade disponível apenas para usuários premium' }, { status: 403 })
    }

    const resolvedParams = await params

    const body = await req.json()
    const { name, notes } = body

    // Verificar se a pasta pertence ao usuário
    const folder = await prisma.symptomFolder.findUnique({
      where: { id: resolvedParams.id },
      select: { userId: true }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })
    }

    if (folder.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Atualiza apenas os campos fornecidos
    const updateData: { name?: string; notes?: string | null } = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Nome da pasta inválido' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (notes !== undefined) {
      // Permite string vazia ou null - apenas trim se for string
      updateData.notes = typeof notes === 'string' && notes.trim().length > 0 
        ? notes.trim() 
        : null
      // Notes processado
    }

    // Se não há nada para atualizar, retorna erro
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.symptomFolder.update({
      where: { id: resolvedParams.id },
      data: updateData
    })

    // Retornar apenas os campos necessários (sem select para evitar problemas)
    const response = {
      id: updated.id,
      name: updated.name,
      notes: updated.notes || null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] Erro ao atualizar pasta')
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// DELETE - Excluir pasta
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar premium antes de excluir
  const isPremium = await isUserPremium(session.user.id)
  if (!isPremium) {
    return NextResponse.json({ error: 'Funcionalidade disponível apenas para usuários premium' }, { status: 403 })
  }

  const resolvedParams = await params

  // Verificar se a pasta pertence ao usuário
  const folder = await prisma.symptomFolder.findUnique({
    where: { id: resolvedParams.id },
    select: { userId: true }
  })

  if (!folder) {
    return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })
  }

  if (folder.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  await prisma.symptomFolder.delete({
    where: { id: resolvedParams.id }
  })

  return NextResponse.json({ success: true })
}

