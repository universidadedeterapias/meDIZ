#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'
import { resolveCatalogProductByHotmartId } from '@/lib/purchases/resolve-product'

const PHYSICAL_IDS = ['6667092', '6652189', '6649928']

async function main() {
  console.log('=== Mapeamento livro físico O CORPO DIZ ===\n')

  for (const id of PHYSICAL_IDS) {
    const resolved = await resolveCatalogProductByHotmartId(id)
    console.log(`Hotmart ${id} →`, resolved ?? 'NÃO RESOLVE')
  }

  const products = await prisma.catalogProduct.findMany({
    where: {
      OR: [
        { hotmartProductId: { in: PHYSICAL_IDS } },
        { title: { contains: 'CORPO DIZ', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      title: true,
      hotmartProductId: true,
      permissionKey: true,
      active: true,
      grantsAsSource: {
        include: {
          grantedProduct: { select: { title: true, permissionKey: true } }
        }
      },
      externalIds: { select: { externalId: true, provider: true } }
    }
  })

  console.log('\nProdutos no catálogo:')
  for (const p of products) {
    console.log(`\n  ${p.title} (${p.permissionKey}) active=${p.active}`)
    console.log(`    hotmartProductId: ${p.hotmartProductId}`)
    console.log(
      `    externalIds:`,
      p.externalIds.map((e) => `${e.provider}:${e.externalId}`).join(', ') || 'nenhum'
    )
    console.log(
      `    grants:`,
      p.grantsAsSource.map((g) => g.grantedProduct.title).join(', ') || 'nenhum'
    )
  }

  const start = new Date()
  start.setDate(start.getDate() - 3)
  start.setHours(0, 0, 0, 0)

  const recentEnts = await prisma.productEntitlement.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'desc' },
    include: {
      catalogProduct: {
        select: { title: true, permissionKey: true, hotmartProductId: true }
      }
    }
  })

  console.log(`\nEntitlements últimos 3 dias: ${recentEnts.length}`)
  for (const e of recentEnts) {
    console.log(
      `  ${e.createdAt.toISOString()} | ${e.email} | ${e.catalogProduct?.title} | ext=${e.externalTransactionId}`
    )
  }

  const livros = await prisma.catalogProduct.findMany({
    where: {
      OR: [
        { permissionKey: 'LIVRO_DIGITAL' },
        { title: { contains: 'CORPO', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      title: true,
      locale: true,
      hotmartProductId: true,
      section: true,
      active: true
    },
    orderBy: { title: 'asc' }
  })
  console.log('\nTodos produtos LIVRO_DIGITAL / CORPO:')
  for (const p of livros) {
    console.log(`  [${p.locale}] ${p.title} hotmart=${p.hotmartProductId}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
