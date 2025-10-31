import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { analyzeRouteData } from '@/lib/security/injection-route-helper'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // 🔒 Detectar SQL/Command Injection antes de processar
    const securityCheck = await analyzeRouteData(
      request,
      '/api/user/form',
      body,
      session.user.id
    )
    
    // Se detectado, retorna 403 automaticamente
    if (securityCheck) {
      return securityCheck
    }
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
