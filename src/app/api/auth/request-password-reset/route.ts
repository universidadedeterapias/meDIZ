import crypto from 'crypto'
import { addMinutes } from 'date-fns'
import { NextResponse } from 'next/server'
import { getCurrentLanguage } from '@/i18n/server'
import { sendEmail } from '@/lib/email/mailer'
import { buildPasswordResetEmail } from '@/lib/email/templates/password-reset'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import {
  checkRateLimit,
  extractRateLimitIdentifier
} from '@/lib/rateLimiter'
import {
  hashResetToken,
  resetIdentifierFor
} from '@/lib/auth/password-reset-token'

/**
 * Pedido de redefinicao de senha — o link vai por e-mail.
 *
 * Substitui `POST /api/request-reset-whatsapp`, que so enviava para quem tinha
 * telefone cadastrado e devolvia `ok` silencioso para os outros: um quinto da base
 * pedia o link e nunca recebia nada.
 */

const TOKEN_EXPIRY_MINUTES = 30

function resolveBaseUrl(): string {
  const fromEnv =
    process.env.NODE_ENV === 'production'
      ? 'https://mediz.app'
      : process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        'http://localhost:3000'

  const base = fromEnv.replace(/\/+$/g, '')
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(base) ? base : `https://${base}`
}

export async function POST(req: Request) {
  let email: string

  try {
    const body = await req.json()
    if (!body?.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    email = body.email.trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Duas travas: uma impede insistir no mesmo endereco, a outra impede varrer
  // varios enderecos da mesma origem. Sem elas a rota vira torneira de e-mail, e
  // dominio que dispara em rajada perde reputacao de entrega.
  const porEmail = await checkRateLimit(`pwreset:email:${email}`)
  const porOrigem = await checkRateLimit(
    `pwreset:ip:${extractRateLimitIdentifier(req)}`
  )

  if (!porEmail.allowed || !porOrigem.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.max(
              1,
              Math.ceil(
                (Math.max(porEmail.resetTime, porOrigem.resetTime) - Date.now()) /
                  1000
              )
            )
          )
        }
      }
    )
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Conta inexistente responde igual a conta existente: quem esta do outro lado
  // nao descobre quem tem cadastro aqui.
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const expires = addMinutes(new Date(), TOKEN_EXPIRY_MINUTES)

  // Um pedido novo invalida o anterior: dois links validos ao mesmo tempo so
  // aumentam a janela de quem interceptar o primeiro. O filtro e o identifier
  // prefixado — com o e-mail puro o delete levava junto o token de confirmacao de
  // cadastro, que divide esta tabela e grava sem prefixo.
  const identifier = resetIdentifierFor(email)

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: { identifier, token: hashResetToken(rawToken), expires }
  })

  const resetUrl = `${resolveBaseUrl()}/reset?token=${rawToken}&email=${encodeURIComponent(email)}`

  const { subject, html, text } = buildPasswordResetEmail({
    language: await getCurrentLanguage(),
    nome: user.fullName ?? user.name ?? null,
    resetUrl,
    expiryMinutes: TOKEN_EXPIRY_MINUTES
  })

  const enviado = await sendEmail({ to: email, subject, html, text })

  if (!enviado) {
    // Este 502 distingue conta existente de inexistente para quem esta olhando os
    // status — mas so enquanto nosso SMTP estiver quebrado. Preferimos esse custo
    // a deixar a pessoa esperando um e-mail que nunca vai chegar.
    logger.error(
      'Falha ao enviar link de redefinicao',
      undefined,
      '[auth/request-password-reset]'
    )
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
