#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'
import { resolveCatalogProductByHotmartId } from '@/lib/purchases/resolve-product'
import { resolveHotmartGrantProductIds } from '@/lib/purchases/hotmart-grant-rules'

const CASES = [
  { id: '6667092', expect: 'só PDF' },
  { id: '6652189', expect: 'livro + PDF' },
  { id: '5136292', expect: 'só PDF' },
  { id: '6199323', expect: 'audioterapia + PDF bônus' }
]

async function main() {
  for (const c of CASES) {
    const product = await resolveCatalogProductByHotmartId(c.id)
    if (!product) {
      console.log(`❌ ${c.id}: não resolve`)
      continue
    }
    const grantIds = await resolveHotmartGrantProductIds(c.id, product.id)
    const titles = await prisma.catalogProduct.findMany({
      where: { id: { in: grantIds } },
      select: { title: true }
    })
    console.log(`${c.id} (${c.expect}) → ${titles.map((t) => t.title).join(' + ')}`)
  }
}

main().finally(() => prisma.$disconnect())
