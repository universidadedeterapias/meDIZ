#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { HOTMART_PURCHASE_RULES } from '@/lib/purchases/catalog-purchase-mapping'
import { resolveCatalogProductByHotmartId } from '@/lib/purchases/resolve-product'
import { resolveCatalogProductByRef } from '@/lib/purchases/resolve-product-ref'
import { prisma } from '@/lib/prisma'

async function main() {
  console.log('=== Auditoria Hotmart → Catálogo ===\n')

  let ok = 0
  let fail = 0
  let missingProduct = 0

  for (const rule of HOTMART_PURCHASE_RULES) {
    const source = await resolveCatalogProductByRef(rule.source)
    const label = `${rule.source.section}/${rule.source.permissionKey}${rule.source.titleIncludes ? ` "${rule.source.titleIncludes}"` : ''}`

    if (!source) {
      console.log(`❌ PRODUTO AUSENTE no catálogo: ${label}`)
      console.log(`   IDs Hotmart: ${rule.hotmartProductIds.join(', ')}\n`)
      missingProduct++
      continue
    }

    const dbProduct = await prisma.catalogProduct.findUnique({
      where: { id: source.id },
      select: {
        title: true,
        hotmartProductId: true,
        externalIds: { select: { externalId: true } },
        grantsAsSource: {
          include: { grantedProduct: { select: { title: true } } }
        }
      }
    })

    for (const hotmartId of rule.hotmartProductIds) {
      const resolved = await resolveCatalogProductByHotmartId(hotmartId)
      if (resolved?.id === source.id) {
        console.log(`✅ ${hotmartId} → ${resolved.title}`)
        ok++
      } else {
        console.log(`❌ ${hotmartId} → ${resolved?.title ?? 'NÃO RESOLVE'} (esperado: ${source.title})`)
        fail++
      }
    }

    const extIds = dbProduct?.externalIds.map((e) => e.externalId) ?? []
    const grants =
      dbProduct?.grantsAsSource.map((g) => g.grantedProduct.title).join(', ') ||
      'nenhum'
    console.log(
      `   DB: primary=${dbProduct?.hotmartProductId} | external=[${extIds.join(', ')}] | bônus: ${grants}\n`
    )
  }

  const medizId = process.env.HOTMART_MEDIZ_PRODUCT_ID?.trim()
  console.log('--- Assinatura Mediz ---')
  console.log(`HOTMART_MEDIZ_PRODUCT_ID=${medizId ?? 'NÃO CONFIGURADO'}`)

  const courses = await prisma.catalogProduct.findMany({
    where: { permissionKey: 'VIDEO', active: true },
    select: {
      title: true,
      hotmartProductId: true,
      stoneProductId: true,
      externalIds: { select: { externalId: true, provider: true } }
    },
    orderBy: { title: 'asc' }
  })
  console.log('\n--- Cursos (VIDEO) no catálogo ---')
  for (const c of courses) {
    const hotmart = c.hotmartProductId
      ? await resolveCatalogProductByHotmartId(c.hotmartProductId)
      : null
    const ext = c.externalIds.filter((e) => e.provider === 'HOTMART')
    console.log(
      `${hotmart ? '✅' : c.hotmartProductId ? '❌' : '⚠️ '} ${c.title} | hotmart=${c.hotmartProductId ?? '—'} | stone=${c.stoneProductId ?? '—'} | ext=${ext.map((e) => e.externalId).join(',') || '—'}`
    )
  }

  const unmapped = await prisma.catalogProduct.findMany({
    where: {
      active: true,
      paymentProvider: 'HOTMART',
      hotmartProductId: null,
      section: { in: ['BIBLIOTECA', 'AUDIOTERAPIA'] }
    },
    select: { title: true, permissionKey: true, section: true }
  })
  if (unmapped.length) {
    console.log('\n--- Produtos Hotmart SEM ID cadastrado ---')
    for (const p of unmapped) {
      console.log(`⚠️  [${p.section}] ${p.title} (${p.permissionKey})`)
    }
  }

  console.log(`\nResumo regras: ${ok} IDs OK, ${fail} IDs falhando, ${missingProduct} produtos ausentes`)

  const extraIds = ['5136292', '5831214', '6294155', '6649928', '7377949']
  console.log('\n--- IDs adicionais (resolve direto) ---')
  for (const id of extraIds) {
    const r = await resolveCatalogProductByHotmartId(id)
    console.log(`${r ? '✅' : '❌'} ${id} → ${r?.title ?? 'NÃO RESOLVE'}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
