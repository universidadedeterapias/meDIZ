// app/api/symptoms/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
import { NextResponse } from 'next/server'

// POST - Salvar sintoma em uma pasta
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { folderId, symptom, threadId } = await req.json()

  if (!folderId || !symptom) {
    return NextResponse.json({ error: 'folderId e symptom são obrigatórios' }, { status: 400 })
  }

  // Verificar se é premium (obrigatório para salvar sintomas)
  const isPremium = await isUserPremium(session.user.id)
  if (!isPremium) {
    return NextResponse.json({ error: 'Funcionalidade disponível apenas para usuários premium' }, { status: 403 })
  }

  // Verificar se a pasta pertence ao usuário
  const folder = await prisma.symptomFolder.findUnique({
    where: { id: folderId },
    select: { userId: true }
  })

  if (!folder) {
    return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })
  }

  if (folder.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const savedSymptom = await prisma.savedSymptom.create({
    data: {
      folderId,
      symptom: symptom.trim(),
      threadId: threadId || null
    }
  })

  return NextResponse.json(savedSymptom)
}

