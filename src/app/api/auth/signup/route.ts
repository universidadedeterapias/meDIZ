// src/app/api/auth/signup/route.ts
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'É preciso enviar email e senha.' },
        { status: 400 }
      )
    }

    // 1) Verifica se já existe
    const existing = await prisma.user.findUnique({
      where: { email }
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário com esse email.' },
        { status: 409 }
      )
    }

    // 2) Hash da senha
    const passwordHash = await hash(password, 12)

    // 3) Cria o usuário
    const user = await prisma.user.create({
      data: {
        email,
        name, // opcional
        passwordHash // o campo que você adicionou no schema.prisma
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    // 4) Retorna 201 com os dados “seguros”
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar usuário.' },
      { status: 500 }
    )
  }
}
