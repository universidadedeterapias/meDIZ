import { prisma } from '../src/lib/prisma'
import { listCatalogProducts } from '../src/lib/catalog/products'

async function main() {
  try {
    const count = await prisma.catalogProduct.count()
    console.log('count', count)
    const rows = await prisma.catalogProduct.findMany({
      take: 2,
      select: {
        id: true,
        title: true,
        mediaFileName: true,
        mediaItems: true
      }
    })
    console.log('sample', JSON.stringify(rows, null, 2))
    const products = await listCatalogProducts({
      section: 'AUDIOTERAPIA',
      activeOnly: false
    })
    console.log('list OK', products.length)
  } catch (e) {
    console.error('ERROR', e)
  }
}

main().finally(() => prisma.$disconnect())
