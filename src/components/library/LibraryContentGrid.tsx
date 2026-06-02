'use client'

import { FileText, BookOpen, Sparkles } from 'lucide-react'
import { LibraryItemTile } from './LibraryItemTile'
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/i18n/config'

type LibraryPermissoes = {
  pdf: boolean
  livro_digital: boolean
}

export type PdfTile = {
  label: string
  url?: string
}

type LibraryContentGridProps = {
  permissoes: LibraryPermissoes
  language: LanguageCode
  openingKey: string | null
  pdfTiles: PdfTile[]
  lockedLabel: string
  labels: {
    sectionContents: string
    sectionPdf: string
    livroTitle: string
    livroDesc: string
    pdfPackTitle: string
    pdfPackDesc: string
    actionOpen: string
    actionRead: string
    loadingLabel: string
    languageNote: string
    unlockedCount: (n: number, total: number) => string
  }
  onOpenLivro: () => void
  onOpenPdf: (index: number) => void
  onLockedClick: () => void
}

const CONTENT_TYPES = 2

export function LibraryContentGrid({
  permissoes,
  language,
  openingKey,
  pdfTiles,
  lockedLabel,
  labels,
  onOpenLivro,
  onOpenPdf,
  onLockedClick
}: LibraryContentGridProps) {
  const unlockedCount = [permissoes.pdf, permissoes.livro_digital].filter(
    Boolean
  ).length

  const langLabel = LANGUAGE_OPTIONS[language]?.label ?? language

  const pdfUnlocked = permissoes.pdf
  const showPdfTiles =
    pdfUnlocked && pdfTiles.length > 0
      ? pdfTiles
      : [{ label: 'Material 1' }, { label: 'Material 2' }]
  const pdfCount = showPdfTiles.length

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-4 py-6 text-white shadow-lg sm:rounded-2xl sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-violet-400/30 blur-2xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {labels.sectionContents}
          </div>
          <p className="text-sm text-indigo-100 sm:text-base">
            {labels.unlockedCount(unlockedCount, CONTENT_TYPES)}
          </p>
          <p className="mt-3 text-xs text-indigo-200/90 sm:text-sm">
            {labels.languageNote.replace('{{lang}}', langLabel)}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {labels.sectionContents}
        </h2>
        <div className="grid max-w-md grid-cols-1 gap-3 sm:gap-5">
          <LibraryItemTile
            title={labels.livroTitle}
            subtitle={labels.livroDesc}
            icon={BookOpen}
            accent="emerald"
            unlocked={permissoes.livro_digital}
            isLoading={openingKey === 'livro_digital'}
            actionLabel={labels.actionRead}
            lockedLabel={lockedLabel}
            loadingLabel={labels.loadingLabel}
            onClick={() =>
              permissoes.livro_digital ? onOpenLivro() : onLockedClick()
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {labels.sectionPdf}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {labels.pdfPackDesc}
            </p>
          </div>
          {pdfUnlocked && (
            <span className="w-fit shrink-0 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {pdfCount} {pdfCount === 1 ? 'PDF' : 'PDFs'}
            </span>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:max-w-2xl sm:gap-5">
          {showPdfTiles.map((tile, index) => (
            <LibraryItemTile
              key={`pdf-${index}-${tile.label}`}
              title={tile.label}
              subtitle={pdfUnlocked ? labels.pdfPackTitle : undefined}
              icon={FileText}
              accent="amber"
              unlocked={pdfUnlocked}
              isLoading={openingKey === `pdf-${index}`}
              actionLabel={labels.actionOpen}
              lockedLabel={lockedLabel}
              loadingLabel={labels.loadingLabel}
              onClick={() =>
                pdfUnlocked ? onOpenPdf(index) : onLockedClick()
              }
            />
          ))}
        </div>
      </section>
    </div>
  )
}
