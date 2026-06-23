/**
 * Catálogo visual dos produtos (biblioteca e audioterapia).
 *
 * Para trocar a capa de um produto, substitua o arquivo em `public/catalog/`
 * ou altere `imageSrc` abaixo.
 *
 * Links de compra: variáveis NEXT_PUBLIC_HOTMART_* no .env
 */

export type LibraryPermissionKey = 'livro_digital' | 'pdf' | 'audioterapia'

export type BibliotecaProductId = 'livro_corpo_diz' | 'pdf_sintomas'

export type AudioterapiaProductId = 'audioterapia_principal'

export type ProductCatalogEntry = {
  id: string
  permissionKey: LibraryPermissionKey
  /** Índice quando há vários PDFs (permissoes.pdf) */
  pdfIndex?: number
  imageSrc: string
  imageAlt: string
  purchaseUrl: string
  titleKey: string
  titleFallback: string
  descriptionKey: string
  descriptionFallback: string
  tagKey: string
  tagFallback: string
  unlockedLabelKey: string
  unlockedLabelFallback: string
}

const DEFAULT_HOTMART =
  process.env.NEXT_PUBLIC_HOTMART_SALES_URL || 'https://pay.hotmart.com/'

function purchaseUrl(envName: string): string {
  const value = process.env[envName]
  return typeof value === 'string' && value.length > 0 ? value : DEFAULT_HOTMART
}

/** Produtos exibidos em /biblioteca */
export const BIBLIOTECA_CATALOG: ProductCatalogEntry[] = [
  {
    id: 'livro_corpo_diz',
    permissionKey: 'livro_digital',
    imageSrc: '/catalog/livro-o-corpo-diz.jpg',
    imageAlt: 'Livro O Corpo Diz',
    purchaseUrl: purchaseUrl('NEXT_PUBLIC_HOTMART_LIVRO_URL'),
    titleKey: 'catalog.livro.title',
    titleFallback: 'O CORPO DIZ',
    descriptionKey: 'catalog.livro.description',
    descriptionFallback:
      'Versão digital do livro para consultar os significados biológicos dos sintomas.',
    tagKey: 'catalog.livro.tag',
    tagFallback: 'Livro digital',
    unlockedLabelKey: 'catalog.action.readBook',
    unlockedLabelFallback: 'Acessar livro'
  },
  {
    id: 'pdf_sintomas',
    permissionKey: 'pdf',
    pdfIndex: 0,
    imageSrc: '/catalog/pdf-100-sintomas.jpg',
    imageAlt: '100 Sintomas Decodificados',
    purchaseUrl: purchaseUrl('NEXT_PUBLIC_HOTMART_PDF_URL'),
    titleKey: 'catalog.pdf.title',
    titleFallback: '100 Sintomas Decodificados',
    descriptionKey: 'catalog.pdf.description',
    descriptionFallback:
      'Guia direto para pesquisar possíveis origens emocionais dos sintomas mais comuns.',
    tagKey: 'catalog.pdf.tag',
    tagFallback: 'PDF',
    unlockedLabelKey: 'catalog.action.accessPdf',
    unlockedLabelFallback: 'Acessar PDF'
  }
]

/** Produto principal em /audioterapia */
export const AUDIOTERAPIA_CATALOG: ProductCatalogEntry[] = [
  {
    id: 'audioterapia_principal',
    permissionKey: 'audioterapia',
    imageSrc: '/catalog/audioterapia.jpg',
    imageAlt: 'Audioterapias',
    purchaseUrl: purchaseUrl('NEXT_PUBLIC_HOTMART_AUDIOTERAPIA_URL'),
    titleKey: 'catalog.audioterapia.title',
    titleFallback: 'Audioterapias',
    descriptionKey: 'catalog.audioterapia.description',
    descriptionFallback:
      'Áudios guiados para apoiar processos emocionais com base no sentido biológico.',
    tagKey: 'catalog.audioterapia.tag',
    tagFallback: 'Áudios guiados',
    unlockedLabelKey: 'catalog.action.listen',
    unlockedLabelFallback: 'Ouvir agora'
  }
]

/** Chips opcionais (só exibidos com acesso liberado) */
export type AudioterapiaThemeChip = {
  id: string
  labelKey: string
  labelFallback: string
}

export const AUDIOTERAPIA_THEME_CHIPS: AudioterapiaThemeChip[] = [
  {
    id: 'sentido_biologico',
    labelKey: 'catalog.audioterapia.theme.bio',
    labelFallback: 'Sentido Biológico'
  },
  {
    id: 'dor_existencial',
    labelKey: 'catalog.audioterapia.theme.pain',
    labelFallback: 'Dor Existencial'
  },
  {
    id: 'traumas',
    labelKey: 'catalog.audioterapia.theme.trauma',
    labelFallback: 'Liberando Traumas'
  }
]
