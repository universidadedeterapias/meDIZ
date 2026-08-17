/**
 * Aplica HOTMART_PURCHASE_RULES no banco: hotmartProductId, external IDs (Hotmart e
 * Stone/Guru), grants e freeAccess.
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

type ResolvedGroup = {
  productId: string
  productTitle: string
  hotmartIds: string[]
  stoneIds: string[]
  grantIds: Set<string>
  /** false p/ LIVRO_DIGITAL — bônus é feito por código (hotmart-grant-rules.ts /
   * CatalogProductGrant manual pro caminho Stone), então o sync não deve mexer nisso. */
  manageGrants: boolean
  paymentProvider: 'HOTMART' | 'FREE'
  freeAccess?: boolean
}

async function main() {
  console.log('Sincronizando mapeamento Hotmart/Stone → catálogo...\n')

  let skipped = 0

  // Agrupa por produto resolvido ANTES de escrever no banco. Mais de uma regra pode
  // resolver pro mesmo produto (ex.: enquanto não existem entradas dedicadas por
  // idioma, PT/ES/EN compartilham "O CORPO DIZ"). Sincronizar external_ids regra a
  // regra faria cada `syncCatalogProductExternalIds` (delete+recreate) apagar o que a
  // regra anterior tinha acabado de gravar pro mesmo produto — por isso agrupamos
  // primeiro e escrevemos uma vez por produto, com a união de todas as regras.
  const groups = new Map<string, ResolvedGroup>()

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

    // Livro digital libera o bônus (PDF) via código, não via CatalogProductGrant
    // gerenciado por este script: caminho Hotmart usa regra hardcoded em
    // hotmart-grant-rules.ts; caminho Stone/Guru usa um CatalogProductGrant cadastrado
    // manualmente pro produto. Se sincronizássemos com [] aqui, apagaríamos esse grant
    // manual toda vez que o script rodasse.
    const isLivroDigital = rule.source.permissionKey === 'LIVRO_DIGITAL'
    const grantIds = isLivroDigital ? [] : await resolveCatalogProductRefs(rule.alsoGrant)

    let group = groups.get(source.id)
    if (!group) {
      group = {
        productId: source.id,
        productTitle: source.title,
        hotmartIds: [],
        stoneIds: [],
        grantIds: new Set(),
        manageGrants: !isLivroDigital,
        paymentProvider: rule.freeAccess ? 'FREE' : 'HOTMART',
        freeAccess: rule.freeAccess
      }
      groups.set(source.id, group)
    }
    group.hotmartIds.push(...rule.hotmartProductIds)
    group.stoneIds.push(...(rule.stoneProductIds ?? []))
    grantIds.forEach((id) => group!.grantIds.add(id))
  }

  let applied = 0
  for (const group of groups.values()) {
    const [primaryHotmartId, ...extraHotmartIds] = group.hotmartIds

    await prisma.catalogProduct.update({
      where: { id: group.productId },
      data: {
        hotmartProductId: primaryHotmartId,
        paymentProvider: group.paymentProvider,
        ...(group.freeAccess != null ? { freeAccess: group.freeAccess } : {})
      }
    })

    await syncCatalogProductExternalIds(
      group.productId,
      'HOTMART',
      extraHotmartIds,
      primaryHotmartId
    )
    if (group.stoneIds.length) {
      await syncCatalogProductExternalIds(group.productId, 'STONE', group.stoneIds)
    }
    if (group.manageGrants) {
      await syncCatalogProductGrants(group.productId, [...group.grantIds])
    }

    console.log(
      `✅ ${group.productTitle} ← Hotmart ${group.hotmartIds.join(', ')}` +
        (group.stoneIds.length ? ` | Stone ${group.stoneIds.join(', ')}` : '') +
        (group.grantIds.size ? ` (+${group.grantIds.size} grants)` : '') +
        (group.freeAccess ? ' [freeAccess]' : '')
    )
    applied++
  }

  console.log(
    `\nConcluído: ${applied} produto(s) aplicado(s), ${skipped} regra(s) ignorada(s) (produto ausente no catálogo).`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
