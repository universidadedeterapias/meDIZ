import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { validateNewPassword } from '@/lib/passwordValidation'
import { hashPassword } from '@/lib/library/temporaryPassword'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireUser({
    allowPasswordResetRequired: true,
    pathname: '/api/auth/change-password'
  })
  if (auth.ok === false) return auth.response

  try {
    const { password, confirmPassword } = await request.json()

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Senha e confirmação são obrigatórias' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'As senhas não coincidem' },
        { status: 400 }
      )
    }

    const validationError = validateNewPassword(password)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        passwordHash,
        mustResetPassword: false,
        temporaryPasswordPlain: null
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[change-password] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
