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
    select: { title: true, purchaseUrl: true, hotmartProductId: true }
  })
  for (const r of rows) {
    console.log(r.title, '|', r.purchaseUrl, '| hotmart=', r.hotmartProductId)
  }
}
main().finally(() => prisma.$disconnect())
