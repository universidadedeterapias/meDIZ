// src/app/api/auth/signup/route.ts
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { sendSignupConfirmationLink } from '@/lib/auth/signup-confirmation'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, password, whatsapp } = await request.json()

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

    // 3) Cria o usuário SEM emailVerified (precisa confirmar WhatsApp)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        whatsapp: whatsapp || null, // Salvar WhatsApp se fornecido
        emailVerified: null // NÃO verificado até confirmar WhatsApp
      },
      select: {
        id: true,
        email: true,
        whatsapp: true
      }
    })

    // 4) Dispara o link de confirmação por e-mail e, se houver telefone, tambem
    // pelo WhatsApp. O e-mail sempre sai: e o canal que nao depende da Z-API.
    let emailSent = false
    let whatsappSent = false
    let confirmationSent = false

    try {
      const confirmacao = await sendSignupConfirmationLink({
        email,
        nome: null,
        whatsapp: whatsapp || null
      })
      emailSent = confirmacao.emailSent
      whatsappSent = confirmacao.whatsappSent
      confirmationSent = confirmacao.sent
    } catch (confirmationError) {
      // Cadastro feito e link nao enviado ainda tem saida: a tela de espera
      // oferece reenvio. Derrubar o 201 aqui perderia a conta ja criada.
      console.error('Erro ao enviar confirmação de cadastro:', confirmationError)
    }

    // 5) Retorna 201 com os dados
    return NextResponse.json({
      user,
      confirmationSent,
      emailSent,
      whatsappSent,
      message: confirmationSent
        ? 'Usuário criado e link de confirmação enviado!'
        : 'Usuário criado. Reenvie o link de confirmação para ativar a conta.'
    }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar usuário.' },
      { status: 500 }
    )
  }
}
