// src/app/api/confirm-signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errorHandler'

export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json()

    if (!token || !email) {
      return NextResponse.json({ 
        error: 'Token e email são obrigatórios' 
      }, { status: 400 })
    }

    // Buscar token de verificação usando a constraint única
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token
        }
      }
    })

    if (!verificationToken) {
      return NextResponse.json({ 
        error: 'Token de verificação inválido' 
      }, { status: 400 })
    }

    // Verificar se o token expirou
    if (verificationToken.expires < new Date()) {
      // Não deletar - apenas retornar erro (token expira naturalmente)
      return NextResponse.json({ 
        error: 'Token de verificação expirado' 
      }, { status: 400 })
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Usuário não encontrado' 
      }, { status: 404 })
    }

    // Verificar se já está verificado - permitir re-confirmação
    if (user.emailVerified) {
      // Não deletar token - apenas retornar sucesso (token pode ser reutilizado)
      return NextResponse.json({ 
        success: true,
        message: 'Cadastro já confirmado anteriormente. Você já pode fazer login.' 
      }, { status: 200 })
    }

    // Confirmar cadastro
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    })

    // Não deletar token - deixar expirar naturalmente (evita erro de REPLICA IDENTITY)

    return NextResponse.json({
      success: true,
      message: 'Cadastro confirmado com sucesso! Você já pode fazer login.'
    })

  } catch (error) {
    return handleApiError(error, 'Confirm Signup')
  }
}
