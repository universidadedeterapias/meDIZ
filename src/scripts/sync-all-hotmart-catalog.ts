#!/usr/bin/env tsx
/**
 * Aplica todos os mapeamentos Hotmart conhecidos no catálogo (produção).
 * Cursos ficam só na Stone — não altera hotmartProductId de VIDEO.
 *
 * Uso: npx tsx src/scripts/sync-all-hotmart-catalog.ts
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

type Mapping = {
  title: string
  hotmartPrimary: string
  hotmartExternal?: string[]
  grantTitles?: string[]
  freeAccess?: boolean
}

const MAPPINGS: Mapping[] = [
  {
    title: 'O CORPO DIZ',
    hotmartPrimary: '6667092',
    hotmartExternal: ['6652189', '6649928', '7377949']
    // Bônus livro/PDF: regras em hotmart-grant-rules.ts (físico vs digital vs PDF)
  },
  {
    title: 'SENTIDO BIOLÓGICO',
    hotmartPrimary: '5136292',
    hotmartExternal: ['6294155', '5831214']
  },
  {
    title: 'Sentido Biológico - Português',
    hotmartPrimary: '5468221',
    freeAccess: true
  },
  {
    title: 'Dor Existencial',
    hotmartPrimary: '6199323',
    grantTitles: ['SENTIDO BIOLÓGICO']
  },
  {
    title: 'Liberando Almas',
    hotmartPrimary: '468008',
    grantTitles: ['SENTIDO BIOLÓGICO']
  },
  {
    title: 'Liberando Traumas',
    hotmartPrimary: '469034',
    grantTitles: ['SENTIDO BIOLÓGICO']
  }
]

const ALL_HOTMART_IDS = [
  '6667092',
  '6652189',
  '6649928',
  '7377949',
  '5136292',
  '6294155',
  '5831214',
  '5468221',
  '6199323',
  '468008',
  '469034'
]

async function findProductByTitle(title: string) {
  return prisma.catalogProduct.findFirst({
    where: { title, active: true },
    select: { id: true, title: true }
  })
}

async function main() {
  console.log('Sincronizando mapeamento Hotmart completo...\n')

  for (const map of MAPPINGS) {
    const product = await findProductByTitle(map.title)
    if (!product) {
      console.warn(`⚠️  Produto não encontrado: ${map.title}`)
      continue
    }

    await prisma.catalogProduct.update({
      where: { id: product.id },
      data: {
        hotmartProductId: map.hotmartPrimary,
        paymentProvider: 'HOTMART',
        ...(map.freeAccess != null ? { freeAccess: map.freeAccess } : {})
      }
    })

    await syncCatalogProductExternalIds(
      product.id,
      'HOTMART',
      map.hotmartExternal ?? [],
      map.hotmartPrimary
    )

    if (map.grantTitles !== undefined) {
      const grantIds: string[] = []
      for (const grantTitle of map.grantTitles ?? []) {
        const grant = await findProductByTitle(grantTitle)
        if (grant) grantIds.push(grant.id)
        else console.warn(`   ⚠️  Bônus não encontrado: ${grantTitle}`)
      }
      await syncCatalogProductGrants(product.id, grantIds)
    } else if (map.title === 'O CORPO DIZ') {
      await syncCatalogProductGrants(product.id, [])
    }

    const ext = (map.hotmartExternal ?? []).join(', ') || '—'
    const grants =
      map.grantTitles !== undefined ?
        (map.grantTitles.join(', ') || 'nenhum')
      : map.title === 'O CORPO DIZ' ?
        '(runtime: hotmart-grant-rules)'
      : '—'
    console.log(`✅ ${product.title}`)
    console.log(`   Hotmart: ${map.hotmartPrimary} | ext: ${ext} | bônus: ${grants}`)
  }

  const course = await prisma.catalogProduct.findFirst({
    where: { permissionKey: 'VIDEO', active: true },
    select: { id: true, title: true, stoneProductId: true }
  })
  if (course) {
    await prisma.catalogProduct.update({
      where: { id: course.id },
      data: {
        paymentProvider: 'STONE',
        hotmartProductId: null
      }
    })
    console.log(`\n✅ Curso "${course.title}" → Stone (${course.stoneProductId ?? 'sem ID'})`)
  }

  const audioNoId = await prisma.catalogProduct.findMany({
    where: {
      section: 'AUDIOTERAPIA',
      active: true,
      hotmartProductId: null
    },
    select: { title: true }
  })
  for (const a of audioNoId) {
    await prisma.catalogProduct.updateMany({
      where: { title: a.title, active: true },
      data: { paymentProvider: 'HOTMART' }
    })
    console.log(
      `ℹ️  ${a.title} — sem ID Hotmart no catálogo (cadastre no admin se houver produto separado na Hotmart)`
    )
  }

  console.log('\n--- Verificação ---')
  let ok = 0
  let fail = 0
  for (const id of ALL_HOTMART_IDS) {
    const r = await resolveCatalogProductByHotmartId(id)
    if (r) {
      console.log(`✅ ${id} → ${r.title}`)
      ok++
    } else {
      console.log(`❌ ${id} → NÃO RESOLVE`)
      fail++
    }
  }
  console.log(`\nConcluído: ${ok}/${ALL_HOTMART_IDS.length} IDs Hotmart resolvendo.`)
  if (fail > 0) process.exit(1)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
