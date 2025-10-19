// src/app/api/auth/signup/route.ts
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { sendSignupConfirmation, isWhatsAppConfigured, simulateWhatsAppSend } from '@/lib/whatsappService'
import { randomUUID } from 'crypto'

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

    // 4) Se tem WhatsApp, enviar verificação automaticamente
    let whatsappSent = false
    if (whatsapp) {
      try {
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
        
        console.log('[DEBUG] Signup - URL de confirmação gerada:', confirmationUrl)

        // Enviar via WhatsApp
        const userName = email.split('@')[0] // Usar parte antes do @ como nome
        if (isWhatsAppConfigured()) {
          whatsappSent = await sendSignupConfirmation(whatsapp, userName, confirmationUrl)
        } else {
          // Modo de desenvolvimento - simular envio
          simulateWhatsAppSend(whatsapp, `Link de confirmação: ${confirmationUrl}`)
          whatsappSent = true
        }
      } catch (whatsappError) {
        console.error('Erro ao enviar WhatsApp:', whatsappError)
        // Não falhar o cadastro se WhatsApp falhar
      }
    }

    // 5) Retorna 201 com os dados
    return NextResponse.json({ 
      user,
      whatsappSent,
      message: whatsappSent 
        ? 'Usuário criado e link enviado via WhatsApp!'
        : 'Usuário criado. Verifique seu WhatsApp para ativar a conta.'
    }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro interno ao cadastrar usuário.' },
      { status: 500 }
    )
  }
}
