/**
 * Envia PDFs de public/biblioteca para o Cloudflare R2 e grava a URL em catalog_products.
 * Uso:
 *   npx tsx scripts/sync-library-pdfs-cloudinary.ts
 */
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { prisma } from '../src/lib/prisma'
import { saveCatalogMediaFile } from '../src/lib/catalog/media-upload'
import {
  getAbsolutePath,
  resolveLivroDigitalFile,
  resolvePdfVariants
} from '../src/lib/library/contentPaths'
import type { LanguageCode } from '../src/i18n/config'

const LOCALES: LanguageCode[] = ['pt-BR', 'pt-PT', 'en', 'es']

const MAX_PDF_BYTES = 200 * 1024 * 1024

async function uploadPdf(relativePath: string): Promise<string | null> {
  const absolute = getAbsolutePath(relativePath.replace(/\\/g, '/'))
  const { size } = await stat(absolute)
  if (size > MAX_PDF_BYTES) {
    const mb = (size / (1024 * 1024)).toFixed(1)
    const maxMb = (MAX_PDF_BYTES / (1024 * 1024)).toFixed(0)
    console.warn(
      `Ignorado (muito grande: ${mb} MB, máx. ${maxMb} MB): ${relativePath}`
    )
    return null
  }

  const buffer = await readFile(absolute)
  const fileName = path.basename(relativePath)
  try {
    const result = await saveCatalogMediaFile(buffer, fileName, 'pdf')
    return result.publicUrl
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn(`Falha no upload de ${relativePath}: ${msg}`)
    return null
  }
}

async function main() {
  const livroProducts = await prisma.catalogProduct.findMany({
    where: { permissionKey: 'LIVRO_DIGITAL', section: 'BIBLIOTECA' },
    orderBy: { sortOrder: 'asc' }
  })

  const pdfProducts = await prisma.catalogProduct.findMany({
    where: { permissionKey: 'PDF', section: 'BIBLIOTECA' },
    orderBy: { sortOrder: 'asc' }
  })

  let livroUpdated = 0
  for (const locale of LOCALES) {
    const file = resolveLivroDigitalFile(locale)
    if (!file) continue

    const url = await uploadPdf(file.relative)
    if (!url) continue

    const product = livroProducts[0]
    if (!product) {
      console.warn('Nenhum produto LIVRO_DIGITAL no catálogo.')
      break
    }

    await prisma.catalogProduct.update({
      where: { id: product.id },
      data: { mediaFileName: url }
    })
    console.log(`Livro digital (${locale}): ${url}`)
    livroUpdated++
    break
  }

  for (const locale of LOCALES) {
    const variants = resolvePdfVariants(locale)
    if (variants.length === 0) continue

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]
      const url = await uploadPdf(variant.relative)
      if (!url) continue

      const product = pdfProducts.find((p) => p.pdfIndex === i) ?? pdfProducts[i]
      if (!product) {
        console.warn(`Sem produto PDF para índice ${i}`)
        continue
      }

      await prisma.catalogProduct.update({
        where: { id: product.id },
        data: { mediaFileName: url, title: variant.label }
      })
      console.log(`PDF ${locale} [${i}]: ${url}`)
    }
    break
  }

  console.log(
    `\nConcluído. Livro atualizado: ${livroUpdated > 0 ? 'sim' : 'não'}. ` +
      'Confira as URLs no admin.'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
