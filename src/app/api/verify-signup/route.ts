// src/app/api/verify-signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSignupConfirmation, isWhatsAppConfigured, simulateWhatsAppSend } from '@/lib/whatsappService'
import { randomUUID } from 'crypto'
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

    // Verificar se tem WhatsApp cadastrado
    if (!user.whatsapp) {
      return NextResponse.json({ 
        error: 'Número do WhatsApp não cadastrado. Por favor, cadastre seu WhatsApp primeiro.' 
      }, { status: 400 })
    }

    // Gerar token de verificação
    const verificationToken = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    // Salvar token no banco
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: expiresAt
      }
    })

    // Criar URL de confirmação
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
    const confirmationUrl = `${baseUrl}/confirm-signup?token=${verificationToken}&email=${encodeURIComponent(email)}`
    
    console.log('[DEBUG] Verify Signup - URL de confirmação gerada:', confirmationUrl)

    // Enviar via WhatsApp
    const userName = user.fullName || user.name || 'Usuário'
    let sent = false

    if (isWhatsAppConfigured()) {
      sent = await sendSignupConfirmation(user.whatsapp, userName, confirmationUrl)
    } else {
      // Modo de desenvolvimento - simular envio
      simulateWhatsAppSend(user.whatsapp, `Link de confirmação: ${confirmationUrl}`)
      sent = true
    }

    if (!sent) {
      return NextResponse.json({ 
        error: 'Erro ao enviar mensagem via WhatsApp. Tente novamente.' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Link de confirmação enviado via WhatsApp',
      expiresAt: expiresAt.toISOString()
    })

  } catch (error) {
    return handleApiError(error, 'Verify Signup')
  }
}
