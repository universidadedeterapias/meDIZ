/**
 * Aplica HOTMART_PURCHASE_RULES no banco: hotmartProductId, external IDs, grants e freeAccess.
 *
 * Uso: npm run sync:catalog-purchase-mapping
 */
import { prisma } from '@/lib/prisma'
import { HOTMART_PURCHASE_RULES } from '@/lib/purchases/catalog-purchase-mapping'
import { syncCatalogProductGrants } from '@/lib/purchases/catalog-grants'
import { syncCatalogProductExternalIds } from '@/lib/purchases/catalog-external-ids'
import {
  resolveCatalogProductByRef,
  resolveCatalogProductRefs
} from '@/lib/purchases/resolve-product-ref'

async function main() {
  console.log('Sincronizando mapeamento Hotmart → catálogo...\n')

  let applied = 0
  let skipped = 0

  for (const rule of HOTMART_PURCHASE_RULES) {
    const source = await resolveCatalogProductByRef(rule.source)
    if (!source) {
      console.warn(
        `⚠️  Produto não encontrado para regra:`,
        JSON.stringify(rule.source)
      )
      skipped++
      continue
    }

    const grantIds = await resolveCatalogProductRefs(rule.alsoGrant)
    const [primaryHotmartId, ...extraHotmartIds] = rule.hotmartProductIds

    await prisma.catalogProduct.update({
      where: { id: source.id },
      data: {
        hotmartProductId: primaryHotmartId,
        paymentProvider: rule.freeAccess ? 'FREE' : 'HOTMART',
        ...(rule.freeAccess != null ? { freeAccess: rule.freeAccess } : {})
      }
    })

    await syncCatalogProductExternalIds(
      source.id,
      'HOTMART',
      extraHotmartIds,
      primaryHotmartId
    )
    await syncCatalogProductGrants(source.id, grantIds)

    console.log(
      `✅ ${source.title} ← Hotmart ${rule.hotmartProductIds.join(', ')}` +
        (grantIds.length ? ` (+${grantIds.length} grants)` : '') +
        (rule.freeAccess ? ' [freeAccess]' : '')
    )
    applied++
  }

  console.log(`\nConcluído: ${applied} regras aplicadas, ${skipped} ignoradas.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
