// src/app/api/auth/request-reset-whatsapp/route.ts
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { addMinutes } from 'date-fns'
import { NextResponse } from 'next/server'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, '')
}

function toBrazilE164(whats: string) {
  const d = onlyDigits(whats)
  // se já começa com 55 e tem 12~13 dígitos (com DDD + 9), mantém
  if (d.startsWith('55')) return d
  // se tem 10~11 dígitos (ex: 11 + 9XXXX...), prefixa 55
  if (d.length >= 10 && d.length <= 11) return `55${d}`
  return d // fallback: manda como veio
}

function maskTail(whats: string) {
  const d = onlyDigits(whats)
  const last2 = d.slice(-2) || '??'
  return `*****-**${last2}`
}

export async function POST(req: Request) {
  try {
    // validação básica do body e tipo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try {
      body = await req.json()
    } catch (parseErr) {
      console.error('reset-password-whatsapp: invalid JSON body', parseErr)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { email } = body ?? {}
    if (!email || typeof email !== 'string') {
      console.error('reset-password-whatsapp: missing or invalid email', {
        email
      })
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // resposta genérica por padrão
    let maskedPhone: string | null = null

    if (!user) {
      // não revelar se o email existe — retornamos ok, mas logamos para diagnóstico
      console.warn(`reset-password-whatsapp: user not found for email=${email}`)
      return NextResponse.json({ ok: true, maskedPhone: null })
    }

    if (user.whatsapp) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const storedToken = hashToken(rawToken)
      const expires = addMinutes(new Date(), 30)

      // invalida tokens anteriores desse email (boa prática)
      try {
        await prisma.verificationToken.deleteMany({
          where: { identifier: email }
        })
      } catch (delErr) {
        // Não tratar falha na remoção como fatal — é uma operação best-effort.
        // Logamos o erro para diagnóstico e continuamos; se houver um problema
        // sério o bloco de criação abaixo irá falhar e retornará erro apropriado.
        console.error(
          'reset-password-whatsapp: failed deleting old tokens (non-fatal)',
          delErr
        )
      }

      try {
        await prisma.verificationToken.create({
          data: { identifier: email, token: storedToken, expires }
        })
      } catch (createErr) {
        console.error(
          'reset-password-whatsapp: failed creating token',
          createErr
        )
        return NextResponse.json(
          { error: 'Failed to create reset token' },
          { status: 502 }
        )
      }

      const resetUrl = `${
        process.env.NEXT_PUBLIC_APP_URL
      }/reset?token=${rawToken}&email=${encodeURIComponent(email)}`

      // console.log('Generated reset URL:', resetUrl)

      // monta telefone e mensagem
      const phone = toBrazilE164(user.whatsapp)
      const message =
        `Olá, ${user.fullName ?? user.name ?? ''}! ` +
        `Recebemos sua solicitação para redefinir a senha. ` +
        `Acesse o link a seguir (válido por 30 minutos): ${resetUrl}`

      // Z-API
      const zapiUrl = `${process.env.ZAPI_BASE_URL}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`

      try {
        const zRes = await fetch(zapiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': process.env.ZAPI_CLIENT_TOKEN || ''
          },
          body: JSON.stringify({ phone, message })
        })

        if (!zRes.ok) {
          const text = await zRes.text().catch(() => '<no-body>')
          console.error('reset-password-whatsapp: z-api returned error', {
            status: zRes.status,
            body: text
          })
          return NextResponse.json(
            { error: 'Failed to send WhatsApp message' },
            { status: 502 }
          )
        }
      } catch (e) {
        console.error('reset-password-whatsapp: Z-API fetch error', e)
        return NextResponse.json(
          { error: 'Failed to send WhatsApp message' },
          { status: 502 }
        )
      }

      maskedPhone = maskTail(user.whatsapp)
    }

    return NextResponse.json({ ok: true, maskedPhone })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    // em modo DEBUG (variável de ambiente) retornamos a stack para diagnóstico local, caso contrário logamos e retornamos 500 genérico
    console.error('reset-password-whatsapp: unexpected error', e)
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      return NextResponse.json(
        { error: e?.message ?? 'Unexpected error', stack: e?.stack },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
