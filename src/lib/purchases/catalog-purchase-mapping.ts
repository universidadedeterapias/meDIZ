import type { CatalogProductRef } from '@/lib/purchases/resolve-product-ref'

export type HotmartPurchaseRule = {
  /** IDs Hotmart que disparam esta regra (primeiro vira hotmartProductId, demais em external_ids) */
  hotmartProductIds: string[]
  /** Produto comprado no catálogo */
  source: CatalogProductRef
  /** Produtos liberados em cascata (além do source) */
  alsoGrant: CatalogProductRef[]
  /** Marca freeAccess no produto source (ex.: Audioterapia Sentido Biológico) */
  freeAccess?: boolean
}

/**
 * Regras de negócio Hotmart → catálogo.
 * O script `npm run sync:catalog-purchase-mapping` aplica no banco.
 * Produtos são resolvidos por section + permissionKey + locale + titleIncludes.
 */
export const HOTMART_PURCHASE_RULES: HotmartPurchaseRule[] = [
  {
    hotmartProductIds: ['6667092', '6652189'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'LIVRO_DIGITAL',
      locale: 'pt'
    },
    alsoGrant: [
      {
        section: 'BIBLIOTECA',
        permissionKey: 'PDF',
        locale: 'pt',
        titleIncludes: 'Sentido Biológico'
      }
    ]
  },
  {
    hotmartProductIds: ['6649928'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'LIVRO_DIGITAL',
      locale: 'es'
    },
    alsoGrant: [
      {
        section: 'BIBLIOTECA',
        permissionKey: 'PDF',
        locale: 'es',
        titleIncludes: 'Sentido Biológico'
      }
    ]
  },
  {
    hotmartProductIds: ['7377949'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'LIVRO_DIGITAL',
      locale: 'en'
    },
    alsoGrant: [
      {
        section: 'BIBLIOTECA',
        permissionKey: 'PDF',
        locale: 'en',
        titleIncludes: 'Sentido Biológico'
      }
    ]
  },
  {
    hotmartProductIds: ['5136292'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'PDF',
      locale: 'pt',
      titleIncludes: 'Sentido Biológico'
    },
    alsoGrant: []
  },
  {
    hotmartProductIds: ['6294155'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'PDF',
      locale: 'es',
      titleIncludes: 'Sentido Biológico'
    },
    alsoGrant: []
  },
  {
    hotmartProductIds: ['5831214'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'PDF',
      locale: 'en',
      titleIncludes: 'Sentido Biológico'
    },
    alsoGrant: []
  },
  {
    hotmartProductIds: ['5468221'],
    source: {
      section: 'AUDIOTERAPIA',
      permissionKey: 'AUDIOTERAPIA',
      titleIncludes: 'Sentido Biológico'
    },
    alsoGrant: [],
    freeAccess: true
  },
  {
    hotmartProductIds: ['6199323'],
    source: {
      section: 'AUDIOTERAPIA',
      permissionKey: 'AUDIOTERAPIA',
      titleIncludes: 'Dor Existencial'
    },
    alsoGrant: [
      {
        section: 'BIBLIOTECA',
        permissionKey: 'PDF',
        locale: 'pt',
        titleIncludes: 'Sentido Biológico'
      }
    ]
  },
  {
    hotmartProductIds: ['468008'],
    source: {
      section: 'AUDIOTERAPIA',
      permissionKey: 'AUDIOTERAPIA',
      titleIncludes: 'Liberando Almas'
    },
    alsoGrant: [
      {
        section: 'BIBLIOTECA',
        permissionKey: 'PDF',
        locale: 'pt',
        titleIncludes: 'Sentido Biológico'
      }
    ]
  },
  {
    hotmartProductIds: ['469034'],
    source: {
      section: 'AUDIOTERAPIA',
      permissionKey: 'AUDIOTERAPIA',
      titleIncludes: 'Liberando Traumas'
    },
    alsoGrant: [
      {
        section: 'BIBLIOTECA',
        permissionKey: 'PDF',
        locale: 'pt',
        titleIncludes: 'Sentido Biológico'
      }
    ]
  }
]
