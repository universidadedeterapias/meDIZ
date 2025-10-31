// app/api/symptoms/[id]/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
import { NextResponse } from 'next/server'

// PATCH - Mover sintoma para outra pasta
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar premium antes de mover sintoma
  const isPremium = await isUserPremium(session.user.id)
  if (!isPremium) {
    return NextResponse.json({ error: 'Funcionalidade disponível apenas para usuários premium' }, { status: 403 })
  }

  const { folderId } = await req.json()
  const resolvedParams = await params

  if (!folderId) {
    return NextResponse.json({ error: 'folderId é obrigatório' }, { status: 400 })
  }

  // Verificar se o sintoma existe e pertence a uma pasta do usuário
  const symptom = await prisma.savedSymptom.findUnique({
    where: { id: resolvedParams.id },
    include: {
      folder: {
        select: { userId: true }
      }
    }
  })

  if (!symptom) {
    return NextResponse.json({ error: 'Sintoma não encontrado' }, { status: 404 })
  }

  if (symptom.folder.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Verificar se a pasta de destino pertence ao usuário
  const targetFolder = await prisma.symptomFolder.findUnique({
    where: { id: folderId },
    select: { userId: true }
  })

  if (!targetFolder) {
    return NextResponse.json({ error: 'Pasta de destino não encontrada' }, { status: 404 })
  }

  if (targetFolder.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const updated = await prisma.savedSymptom.update({
    where: { id: resolvedParams.id },
    data: { folderId }
  })

  return NextResponse.json(updated)
}

// DELETE - Excluir sintoma
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar premium antes de excluir sintoma
  const isPremium = await isUserPremium(session.user.id)
  if (!isPremium) {
    return NextResponse.json({ error: 'Funcionalidade disponível apenas para usuários premium' }, { status: 403 })
  }

  const resolvedParams = await params

  // Verificar se o sintoma existe e pertence a uma pasta do usuário
  const symptom = await prisma.savedSymptom.findUnique({
    where: { id: resolvedParams.id },
    include: {
      folder: {
        select: { userId: true }
      }
    }
  })

  if (!symptom) {
    return NextResponse.json({ error: 'Sintoma não encontrado' }, { status: 404 })
  }

  if (symptom.folder.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  await prisma.savedSymptom.delete({
    where: { id: resolvedParams.id }
  })

  return NextResponse.json({ success: true })
}

