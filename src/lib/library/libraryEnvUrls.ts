import type { LanguageCode } from '@/i18n/config'
import { PDF_VARIANT_LABELS } from './contentPaths'

function localeEnvSuffix(locale: LanguageCode): string {
  return locale.replace(/-/g, '_')
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : null
}

/** URL do livro digital em produção (quando não há arquivo em public/biblioteca). */
export function livroDigitalUrlFromEnv(locale: LanguageCode): string | null {
  const suffix = localeEnvSuffix(locale)
  return (
    readEnv(`LIBRARY_LIVRO_DIGITAL_URL_${suffix}`) ??
    readEnv(`LIBRARY_LIVRO_URL_${suffix}`) ??
    readEnv('LIBRARY_LIVRO_DIGITAL_URL') ??
    readEnv('LIBRARY_LIVRO_URL')
  )
}

/** URLs dos PDFs por idioma (índice 0, 1, …). */
export function pdfUrlsFromEnv(locale: LanguageCode): Array<{ url: string; label: string }> {
  const suffix = localeEnvSuffix(locale)
  const labels = PDF_VARIANT_LABELS[locale] ?? PDF_VARIANT_LABELS['pt-BR']
  const urls: Array<{ url: string; label: string }> = []

  for (let i = 0; i < 10; i++) {
    const url =
      readEnv(`LIBRARY_PDF_URL_${suffix}_${i}`) ??
      (i === 0 ? readEnv(`LIBRARY_PDF_URL_${suffix}`) : null)
    if (!url) break
    urls.push({
      url,
      label: labels[i] ?? `Material ${i + 1}`
    })
  }

  return urls
}
