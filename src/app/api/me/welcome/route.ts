import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { normalizeLibraryEmail } from '@/lib/library/email'

export const dynamic = 'force-dynamic'

/** Quantos produtos mostrar. Uma compra libera o item e, no maximo, um bonus. */
const MAX_PRODUCTS = 3

/**
 * O que a pessoa acabou de ganhar acesso — usado para dar contexto no primeiro
 * acesso, onde ela muitas vezes nem sabia que compraria pelo meDIZ.
 *
 * `allowPasswordResetRequired` e essencial: esta rota e consumida justamente pela
 * tela de troca de senha, que roda antes de `mustResetPassword` ser resolvido. Sem
 * isso ela cairia no 403 e a tela ficaria sem o produto — que e o ponto todo.
 */
export async function GET() {
  const auth = await requireUser({ allowPasswordResetRequired: true })
  if (auth.ok === false) return auth.response

  const email = normalizeLibraryEmail(auth.user.email)

  const entitlements = await prisma.productEntitlement.findMany({
    where: { email },
    orderBy: { createdAt: 'desc' },
    take: MAX_PRODUCTS,
    select: {
      createdAt: true,
      catalogProduct: {
        select: {
          id: true,
          title: true,
          section: true,
          permissionKey: true,
          coverImageUrl: true,
          active: true
        }
      }
    }
  })

  const products = entitlements
    .filter((row) => row.catalogProduct?.active)
    .map((row) => ({
      id: row.catalogProduct.id,
      title: row.catalogProduct.title,
      section: row.catalogProduct.section,
      permission_key: row.catalogProduct.permissionKey,
      cover_image_url: row.catalogProduct.coverImageUrl,
      granted_at: row.createdAt.toISOString()
    }))

  return NextResponse.json(
    { products },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
