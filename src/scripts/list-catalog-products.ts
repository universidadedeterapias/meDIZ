#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}
import { prisma } from '@/lib/prisma'

async function main() {
  const rows = await prisma.catalogProduct.findMany({
    where: { active: true },
    select: {
      id: true,
      title: true,
      section: true,
      permissionKey: true,
      locale: true,
      hotmartProductId: true,
      stoneProductId: true,
      externalIds: { select: { externalId: true, provider: true } }
    },
    orderBy: [{ section: 'asc' }, { title: 'asc' }]
  })
  for (const r of rows) {
    console.log(
      JSON.stringify({
        title: r.title,
        section: r.section,
        key: r.permissionKey,
        locale: r.locale,
        hotmart: r.hotmartProductId,
        stone: r.stoneProductId,
        ext: r.externalIds.map((e) => e.externalId)
      })
    )
  }
}
main().finally(() => prisma.$disconnect())
