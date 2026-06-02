import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export type AuthenticatedUser = {
  id: string
  email: string
}

export type AuthSuccess = { ok: true; user: AuthenticatedUser }
export type AuthFailure = { ok: false; response: NextResponse }
export type AuthResult = AuthSuccess | AuthFailure

const PASSWORD_RESET_PATHS = new Set([
  '/api/auth/change-password'
])

export function isPasswordResetExemptPath(pathname: string): boolean {
  return PASSWORD_RESET_PATHS.has(pathname)
}

export async function requireUser(options?: {
  allowPasswordResetRequired?: boolean
  pathname?: string
}): Promise<AuthResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, mustResetPassword: true }
  })

  const email = dbUser?.email ?? session.user.email
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
  }

  const exempt =
    options?.allowPasswordResetRequired ||
    (options?.pathname && isPasswordResetExemptPath(options.pathname))

  if (!exempt && dbUser?.mustResetPassword) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'PASSWORD_RESET_REQUIRED' },
        { status: 403 }
      )
    }
  }

  return {
    ok: true,
    user: {
      id: session.user.id,
      email
    }
  }
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireUser({ allowPasswordResetRequired: true })
  if (result.ok === false) return result

  if (!result.user.email.includes('@mediz.com')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return result
}
