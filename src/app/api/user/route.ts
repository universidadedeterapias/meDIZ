import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
        fullName: true,
        whatsapp: true,
        age: true,
        gender: true,
        profession: true,
        educationOrSpecialty: true,
        yearsOfExperience: true,
        clientsPerWeek: true,
        averageSessionPrice: true,
        appUsage: true,
        description: true,
        createdAt: true,
        updatedAt: true
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
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar os dados do usuário' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const {
    fullName,
    email,
    whatsapp
  }: { fullName?: string; email?: string; whatsapp?: string } = body

  // Validação básica: todos obrigatórios
  if (!fullName || !email || !whatsapp) {
    return NextResponse.json(
      { error: 'fullName, email e whatsapp são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName,
        email,
        whatsapp
      }
    })

    // Retorna o objeto completo que você precisar no client
    return NextResponse.json({
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      whatsapp: updated.whatsapp,
      image: updated.image
    })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Não foi possível atualizar o usuário' },
      { status: 500 }
    )
  }
}
