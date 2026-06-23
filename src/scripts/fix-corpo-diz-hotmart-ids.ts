#!/usr/bin/env tsx
/**
 * Mapeia livro físico (6667092) e digital (6652189) → O CORPO DIZ + bônus SENTIDO BIOLÓGICO.
 * Uso: npx tsx src/scripts/fix-corpo-diz-hotmart-ids.ts
 */
import { config } from 'dotenv'

config({ path: '.env' })
config({ path: '.env.local', override: true })

if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'
import { syncCatalogProductExternalIds } from '@/lib/purchases/catalog-external-ids'
import { syncCatalogProductGrants } from '@/lib/purchases/catalog-grants'
import { resolveCatalogProductByHotmartId } from '@/lib/purchases/resolve-product'
import { resolveCatalogProductByRef } from '@/lib/purchases/resolve-product-ref'

const PHYSICAL_ID = '6667092'
const DIGITAL_ID = '6652189'
/** Versão EN já usada no catálogo — mantida como ID externo adicional */
const EN_DIGITAL_ID = '7377949'

async function main() {
  const corpoDiz = await resolveCatalogProductByRef({
    section: 'BIBLIOTECA',
    permissionKey: 'LIVRO_DIGITAL',
    locale: 'pt'
  })

  if (!corpoDiz) {
    throw new Error('Produto O CORPO DIZ (LIVRO_DIGITAL pt) não encontrado no catálogo')
  }

  const bonus = await resolveCatalogProductByRef({
    section: 'BIBLIOTECA',
    permissionKey: 'PDF',
    locale: 'pt',
    titleIncludes: 'Sentido Biológico'
  })

  await prisma.catalogProduct.update({
    where: { id: corpoDiz.id },
    data: {
      hotmartProductId: PHYSICAL_ID,
      paymentProvider: 'HOTMART',
      freeAccess: false
    }
  })

  await syncCatalogProductExternalIds(
    corpoDiz.id,
    'HOTMART',
    [DIGITAL_ID, EN_DIGITAL_ID],
    PHYSICAL_ID
  )

  if (bonus) {
    await syncCatalogProductGrants(corpoDiz.id, [bonus.id])
  }

  console.log(`✅ ${corpoDiz.title}`)
  console.log(`   Hotmart principal (físico): ${PHYSICAL_ID}`)
  console.log(`   IDs externos: ${DIGITAL_ID} (digital), ${EN_DIGITAL_ID} (EN)`)
  console.log(`   Bônus: ${bonus?.title ?? 'não encontrado'}`)

  for (const id of [PHYSICAL_ID, DIGITAL_ID, EN_DIGITAL_ID]) {
    const resolved = await resolveCatalogProductByHotmartId(id)
    console.log(`   Resolve ${id} → ${resolved?.title ?? 'FALHOU'}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
