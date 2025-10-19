// src/app/api/confirm-signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json()

    if (!token || !email) {
      return NextResponse.json({ 
        error: 'Token e email são obrigatórios' 
      }, { status: 400 })
    }

    // Buscar token de verificação
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: token,
        identifier: email
      }
    })

    if (!verificationToken) {
      return NextResponse.json({ 
        error: 'Token de verificação inválido' 
      }, { status: 400 })
    }

    // Verificar se o token expirou
    if (verificationToken.expires < new Date()) {
      // Remover token expirado
      await prisma.verificationToken.delete({
        where: { 
          token: verificationToken.token
        }
      })
      
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

    // Verificar se já está verificado
    if (user.emailVerified) {
      return NextResponse.json({ 
        error: 'Usuário já está verificado' 
      }, { status: 400 })
    }

    // Confirmar cadastro
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    })

    // Remover token usado
    await prisma.verificationToken.delete({
      where: { 
        token: verificationToken.token
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cadastro confirmado com sucesso! Você já pode fazer login.'
    })

  } catch (error) {
    console.error('[Confirm Signup] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
