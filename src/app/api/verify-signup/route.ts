// src/app/api/verify-signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSignupConfirmationLink } from '@/lib/auth/signup-confirmation'
import { handleApiError } from '@/lib/errorHandler'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        fullName: true,
        whatsapp: true,
        emailVerified: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se já está verificado
    if (user.emailVerified) {
      return NextResponse.json({ 
        error: 'Usuário já está verificado' 
      }, { status: 400 })
    }

    // Telefone deixou de ser condicao para reenviar: o e-mail sozinho ativa a
    // conta, e quem se cadastrou sem WhatsApp ficava sem nenhuma saida aqui.
    const confirmacao = await sendSignupConfirmationLink({
      email,
      nome: user.fullName || user.name || null,
      whatsapp: user.whatsapp
    })

    if (!confirmacao.sent) {
      return NextResponse.json({
        error: 'Não foi possível enviar o link de confirmação. Tente novamente.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Link de confirmação enviado',
      emailSent: confirmacao.emailSent,
      whatsappSent: confirmacao.whatsappSent,
      expiresAt: confirmacao.expiresAt.toISOString()
    })

  } catch (error) {
    return handleApiError(error, 'Verify Signup')
  }
}
