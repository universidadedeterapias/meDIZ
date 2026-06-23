import { prisma } from '../src/lib/prisma'

async function main() {
  const before = await prisma.catalogProduct.count({
    where: { section: 'AUDIOTERAPIA' }
  })
  console.log(`Produtos AUDIOTERAPIA antes: ${before}`)

  const result = await prisma.catalogProduct.deleteMany({
    where: { section: 'AUDIOTERAPIA' }
  })

  console.log(`Excluídos: ${result.count}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
