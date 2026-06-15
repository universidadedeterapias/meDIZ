import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidCpf, normalizeCpf } from '@/lib/cpf'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  ensureLibraryUser,
  grantEntitlementsFromLegacyFlags
} from '@/lib/purchases/migrate-legacy-permissions'
import { notifyN8nNewUser } from '@/lib/purchases/notify-n8n-new-user'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().email(),
  nome: z.string().optional(),
  cpf: z.string().optional().nullable(),
  permissoes: z.object({
    audioterapia: z.boolean(),
    pdf: z.boolean(),
    livro_digital: z.boolean()
  })
})

/**
 * @deprecated Use webhooks Hotmart/Stone diretos. Mantido para transição do n8n antigo.
 * Grava product_entitlements (não library_permissions).
 */
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

    const { email, nome, cpf, permissoes } = parsed.data
    const normalizedEmail = normalizeLibraryEmail(email)

    const cpfDigits =
      cpf == null || cpf === '' ? null : normalizeCpf(String(cpf))
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const { userCreated, temporaryPassword } = await ensureLibraryUser({
      email: normalizedEmail,
      nome: nome ?? null,
      cpf: cpfDigits
    })

    const grant = await grantEntitlementsFromLegacyFlags({
      email: normalizedEmail,
      permissoes: {
        audioterapia: permissoes.audioterapia,
        pdf: permissoes.pdf,
        livro_digital: permissoes.livro_digital
      },
      source: 'library_permissions_api',
      transactionSuffix: `api_${Date.now()}`
    })

    const productsGranted = await prisma.catalogProduct.findMany({
      where: { id: { in: grant.productIds } },
      select: { id: true, title: true }
    })

    await notifyN8nNewUser({
      userCreated,
      email: normalizedEmail,
      nome: nome ?? null,
      telefone: null,
      temporaryPassword: userCreated ? temporaryPassword : null,
      transactionId: `legacy_api_${Date.now()}`,
      provider: 'hotmart',
      productsGranted
    })

    return NextResponse.json(
      {
        ok: true,
        deprecated: true,
        user_created: userCreated,
        entitlements_created: grant.entitlementsCreated,
        permissions: {
          audioterapia: permissoes.audioterapia,
          pdf: permissoes.pdf,
          livro_digital: permissoes.livro_digital
        }
      },
      {
        headers: {
          Deprecation: 'true',
          Link: '</api/hotmart>; rel="successor-version"'
        }
      }
    )
  } catch (error) {
    console.error('[library/permissions] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
