import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { upsertLibraryPermissions } from '@/lib/library/permissions'
import {
  generateTemporaryPassword,
  hashPassword
} from '@/lib/library/temporaryPassword'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().email(),
  nome: z.string().optional(),
  permissoes: z.object({
    audioterapia: z.boolean(),
    pdf: z.boolean(),
    livro_digital: z.boolean()
  })
})

export async function PUT(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, nome, permissoes } = parsed.data
    const normalizedEmail = normalizeLibraryEmail(email)

    const row = await upsertLibraryPermissions(normalizedEmail, nome ?? null, {
      audioterapia: permissoes.audioterapia,
      pdf: permissoes.pdf,
      livro_digital: permissoes.livro_digital
    })

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    })

    let userCreated = false

    if (!existingUser) {
      const temporaryPassword = generateTemporaryPassword(10)
      const passwordHash = await hashPassword(temporaryPassword)

      await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: nome ?? null,
          passwordHash,
          temporaryPasswordPlain: temporaryPassword,
          mustResetPassword: true,
          emailVerified: new Date()
        }
      })
      userCreated = true
    }

    return NextResponse.json({
      ok: true,
      user_created: userCreated,
      permissions: {
        audioterapia: row.audioterapia,
        pdf: row.pdf,
        livro_digital: row.livro_digital
      }
    })
  } catch (error) {
    console.error('[library/permissions] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
