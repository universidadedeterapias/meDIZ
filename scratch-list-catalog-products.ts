import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.catalogProduct.findMany({
    where: { active: true },
    select: { id: true, section: true, title: true, permissionKey: true, freeAccess: true }
  })
  console.log(JSON.stringify(products, null, 2))
  console.log(`\nTotal ativos: ${products.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
