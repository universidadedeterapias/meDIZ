// src/app/api/auth/update-whatsapp/route.ts
import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, whatsapp } = await request.json()

    if (!email || !whatsapp) {
      return NextResponse.json(
        { error: 'Email e WhatsApp são obrigatórios.' },
        { status: 400 }
      )
    }

    // Atualizar WhatsApp do usuário
    const user = await prisma.user.update({
      where: { email },
      data: { whatsapp },
      select: {
        id: true,
        email: true,
        whatsapp: true
      }
    })

    return NextResponse.json({ 
      success: true,
      user 
    }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro interno ao atualizar WhatsApp.' },
      { status: 500 }
    )
  }
}
