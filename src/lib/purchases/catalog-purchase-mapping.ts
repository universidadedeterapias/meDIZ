import type { CatalogProductRef } from '@/lib/purchases/resolve-product-ref'

export type HotmartPurchaseRule = {
  /** IDs Hotmart que disparam esta regra (primeiro vira hotmartProductId, demais em external_ids) */
  hotmartProductIds: string[]
  /** IDs Stone/pagar.me (ex.: checkout Guru) que também apontam pro mesmo produto */
  stoneProductIds?: string[]
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
    /**
     * 6667092 = livro físico | 6652189 = livro digital.
     *
     * Os dois apontam para o mesmo produto de catálogo, e isso é só
     * IDENTIFICAÇÃO: é o que faz a venda do impresso ser reconhecida como livro,
     * virar despacho e ganhar nome na mensagem. O que cada um LIBERA é outra
     * pergunta, e quem responde é `hotmart-grant-rules.ts` — o impresso libera só
     * o PDF bônus, porque o digital é um upsell com preço próprio.
     */
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
    /** EL CUERPO HABLA — produto dedicado (título/PDF em espanhol), criado à parte de
     * "O CORPO DIZ". 1780425821 = checkout Guru, que cai no /api/stone/webhook. */
    hotmartProductIds: ['6649928'],
    stoneProductIds: ['1780425821'],
    source: {
      section: 'BIBLIOTECA',
      permissionKey: 'LIVRO_DIGITAL',
      locale: 'es'
    },
    // Ainda não existe um PDF bônus dedicado em espanhol — libera o mesmo PDF em
    // português que o livro PT/EN já concedem, até termos a versão localizada.
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
    /** ⚠️ Ainda NÃO existe produto de catálogo dedicado para o livro em inglês — este ID
     * continua resolvendo via external_id legado direto em "O CORPO DIZ" (ver
     * migration/script que cadastrou 7377949 lá). Por isso esta regra fica "produto
     * ausente" e é pulada pelo `sync:catalog-purchase-mapping`: rodar o sync completo
     * hoje NÃO reaplica este ID em lugar nenhum, mas também não o remove (a regra do
     * "O CORPO DIZ" acima só lista 6667092/6652189, então preservar isso é intencional —
     * não inclua 7377949 nela sem criar o produto EN dedicado primeiro, senão o
     * external_id legado do inglês fica raw no banco sem nenhuma regra apontando pra ele). */
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
    hotmartProductIds: ['4680085'],
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
    hotmartProductIds: ['4690342'],
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
