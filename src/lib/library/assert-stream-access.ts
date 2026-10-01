import { prisma } from '@/lib/prisma'
import { isFreeCatalogProduct } from '@/lib/catalog/freeProducts'
import { permissionKeyToLib } from '@/lib/catalog/types'
import type { MediaAccessTokenPayload } from '@/lib/library/media-access-token'
import {
  assertLegacyCategoryAccess,
  assertLibraryContentAccess,
  LibraryAccessError,
  type LibraryAuthIdentity
} from '@/lib/library/permissions'
import { getProductEntitlementIdsForUser } from '@/lib/purchases/entitlements'

export class LibraryStreamAccessError extends Error {
  readonly status: number
  constructor(message: string, status = 403) {
    super(message)
    this.name = 'LibraryStreamAccessError'
    this.status = status
  }
}

export async function assertStreamAccess(
  user: LibraryAuthIdentity,
  payload: MediaAccessTokenPayload
): Promise<void> {
  if (payload.uid !== user.id) {
    throw new LibraryStreamAccessError('Token inválido para este usuário', 403)
  }

  if (payload.pid) {
    const product = await prisma.catalogProduct.findUnique({
      where: { id: payload.pid },
      select: {
        active: true,
        permissionKey: true,
        freeAccess: true
      }
    })

    if (!product?.active) {
      throw new LibraryStreamAccessError('Conteúdo indisponível', 404)
    }

    if (!isFreeCatalogProduct(product)) {
      // A liberacao do produto e o que vale. A categoria so entra pela tabela
      // legada — a derivada das compras abria todas as audioterapias por uma.
      const entitled = await getProductEntitlementIdsForUser(user)
      if (entitled.has(payload.pid)) return

      const contentKey = permissionKeyToLib(product.permissionKey)
      try {
        await assertLegacyCategoryAccess(user, contentKey)
      } catch (e) {
        if (e instanceof LibraryAccessError) {
          throw new LibraryStreamAccessError('Sem permissão para este conteúdo', 403)
        }
        throw e
      }
    }
    return
  }

  if (payload.free) return

  if (payload.perm) {
    try {
      await assertLibraryContentAccess(user, payload.perm)
    } catch (e) {
      if (e instanceof LibraryAccessError) {
        throw new LibraryStreamAccessError('Sem permissão para este conteúdo', 403)
      }
      throw e
    }
  }
}
