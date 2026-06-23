#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'

async function main() {
  const days = Number(process.argv[2] || 1)
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  console.log(`=== Compras / liberações (últimos ${days} dia(s)) ===`)
  console.log('Desde:', start.toISOString(), '\n')

  const entitlements = await prisma.productEntitlement.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'desc' },
    include: {
      catalogProduct: {
        select: { title: true, permissionKey: true, hotmartProductId: true }
      }
    }
  })

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      temporaryPasswordPlain: true,
      passwordHash: true
    }
  })

  const subsCreated = await prisma.subscription.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true, createdAt: true } },
      plan: { select: { name: true } }
    }
  })

  const pending = await prisma.pendingHotmartPurchase.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { name: true } } }
  })

  console.log(`Entitlements: ${entitlements.length}`)
  const byEmail = new Map<string, typeof entitlements>()
  for (const e of entitlements) {
    const list = byEmail.get(e.email) ?? []
    list.push(e)
    byEmail.set(e.email, list)
  }
  for (const [email, list] of byEmail) {
    console.log(`\n  ${email}:`)
    for (const e of list) {
      console.log(
        `    - ${e.catalogProduct?.title} (${e.catalogProduct?.permissionKey}) source=${e.source} at=${e.createdAt.toISOString()}`
      )
    }
  }

  console.log(`\nUsuários criados hoje: ${users.length}`)
  for (const u of users) {
    const wouldNotifyN8n = !!u.temporaryPasswordPlain
    console.log(
      `  ${u.email} | tempPwd=${wouldNotifyN8n} | hasPassword=${!!u.passwordHash} | at=${u.createdAt.toISOString()}`
    )
  }

  const subsUpdated = await prisma.subscription.findMany({
    where: {
      updatedAt: { gte: start },
      createdAt: { lt: start }
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { email: true, name: true, createdAt: true } },
      plan: { select: { name: true } }
    }
  })

  console.log(`\nAssinaturas criadas: ${subsCreated.length}`)
  for (const s of subsCreated) {
    console.log(
      `  ${s.user.email} | plan=${s.plan.name} | status=${s.status} | userCreatedToday=${s.user.createdAt >= start}`
    )
  }

  console.log(`\nAssinaturas renovadas/atualizadas (criadas antes): ${subsUpdated.length}`)
  for (const s of subsUpdated) {
    console.log(
      `  ${s.user.email} | plan=${s.plan.name} | status=${s.status} | updated=${s.updatedAt.toISOString()}`
    )
  }

  console.log(`\nPending Hotmart: ${pending.length}`)
  for (const p of pending) {
    console.log(
      `  ${p.email} | plan=${p.plan.name} | status=${p.status} | tx=${p.transaction}`
    )
  }

  const grants = await prisma.catalogProductGrant.findMany({
    include: {
      sourceProduct: { select: { title: true, hotmartProductId: true } },
      grantedProduct: { select: { title: true, permissionKey: true } }
    }
  })
  if (grants.length) {
    console.log(`\nMapeamento de bônus (grants) ativos: ${grants.length}`)
    for (const g of grants) {
      console.log(
        `  Compra "${g.sourceProduct.title}" (hotmart ${g.sourceProduct.hotmartProductId}) → bônus "${g.grantedProduct.title}" (${g.grantedProduct.permissionKey})`
      )
    }
  }

  const hotmartEnts = await prisma.productEntitlement.findMany({
    where: { source: 'hotmart' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { catalogProduct: { select: { title: true } } }
  })
  console.log(`\nÚltimos entitlements source=hotmart: ${hotmartEnts.length}`)
  for (const e of hotmartEnts) {
    console.log(`  ${e.createdAt.toISOString()} | ${e.email} | ${e.catalogProduct?.title}`)
  }

  const pendingCreds = await prisma.user.findMany({
    where: { temporaryPasswordPlain: { not: null } },
    select: { email: true, createdAt: true, whatsappSentAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  console.log(`\nUsuários com senha temporária (fila WhatsApp): ${pendingCreds.length}`)
  for (const u of pendingCreds) {
    console.log(`  ${u.email} | whatsappSent=${u.whatsappSentAt?.toISOString() ?? 'não'}`)
  }

  const detailEmails = process.argv.slice(3)
  if (detailEmails.length) {
    console.log('\n--- Detalhe por e-mail ---')
    for (const email of detailEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          createdAt: true,
          temporaryPasswordPlain: true,
          passwordHash: true,
          mustResetPassword: true,
          whatsappSentAt: true
        }
      })
      const ents = await prisma.productEntitlement.findMany({
        where: { email },
        include: {
          catalogProduct: { select: { title: true, permissionKey: true } }
        }
      })
      const subs = await prisma.subscription.findMany({
        where: { user: { email } },
        include: { plan: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 3
      })
      console.log(`\n${email}`)
      console.log('  user:', user)
      console.log(
        '  entitlements:',
        ents.map((e) => `${e.catalogProduct?.title} (${e.source})`)
      )
      console.log(
        '  subs:',
        subs.map((s) => ({
          plan: s.plan.name,
          status: s.status,
          created: s.createdAt,
          updated: s.updatedAt
        }))
      )
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
