import {
  AUDIOTERAPIA_CATALOG,
  BIBLIOTECA_CATALOG,
  type ProductCatalogEntry
} from './productCatalog'
import type { LibraryPermissoes } from './permissions'

type TranslateFn = (key: string, fallback: string) => string

export type PdfTileMeta = { label: string }

export function resolveBibliotecaOffers(
  permissoes: Pick<LibraryPermissoes, 'livro_digital' | 'pdf'>,
  pdfTiles: PdfTileMeta[],
  t: TranslateFn,
  lockedLabel: string
) {
  const offers: Array<
    ProductCatalogEntry & {
      title: string
      description: string
      tag: string
      unlockedLabel: string
      lockedLabel: string
      unlocked: boolean
    }
  > = []

  for (const entry of BIBLIOTECA_CATALOG) {
    if (entry.permissionKey === 'livro_digital') {
      offers.push({
        ...entry,
        title: t(entry.titleKey, entry.titleFallback),
        description: t(entry.descriptionKey, entry.descriptionFallback),
        tag: t(entry.tagKey, entry.tagFallback),
        unlockedLabel: t(entry.unlockedLabelKey, entry.unlockedLabelFallback),
        lockedLabel,
        unlocked: permissoes.livro_digital
      })
      continue
    }

    if (entry.permissionKey === 'pdf') {
      const pdfCount = Math.max(pdfTiles.length, 1)

      for (let i = 0; i < pdfCount; i++) {
        const tile = pdfTiles[i]
        const isTemplate = entry.pdfIndex === 0 && i === 0

        offers.push({
          ...entry,
          id: i === 0 ? entry.id : `${entry.id}_${i}`,
          pdfIndex: i,
          imageSrc: entry.imageSrc,
          title: tile?.label ?? t(entry.titleKey, entry.titleFallback),
          description: isTemplate
            ? t(entry.descriptionKey, entry.descriptionFallback)
            : t(
                'catalog.pdf.descriptionExtra',
                'Material complementar em PDF incluído na sua compra.'
              ),
          tag: t(entry.tagKey, entry.tagFallback),
          unlockedLabel: t(entry.unlockedLabelKey, entry.unlockedLabelFallback),
          lockedLabel,
          unlocked: permissoes.pdf
        })
      }
    }
  }

  return offers
}

export function resolveAudioterapiaOffers(
  unlocked: boolean,
  t: TranslateFn,
  lockedLabel: string
) {
  return AUDIOTERAPIA_CATALOG.map((entry) => ({
    ...entry,
    title: t(entry.titleKey, entry.titleFallback),
    description: t(entry.descriptionKey, entry.descriptionFallback),
    tag: t(entry.tagKey, entry.tagFallback),
    unlockedLabel: t(entry.unlockedLabelKey, entry.unlockedLabelFallback),
    lockedLabel,
    unlocked
  }))
}
