import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      fullName,
      whatsapp,
      age,
      gender,
      profession,
      appUsage,
      description,
      educationOrSpecialty,
      yearsOfExperience,
      clientsPerWeek,
      averageSessionPrice
    } = body

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName,
        whatsapp,
        age,
        gender,
        profession,
        appUsage,
        description,
        educationOrSpecialty,
        yearsOfExperience,
        clientsPerWeek,
        averageSessionPrice
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar formulário:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar os dados' },
      { status: 500 }
    )
  }
}
