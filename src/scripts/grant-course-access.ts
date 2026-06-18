/**
 * Libera cursos (VIDEO) via ProductEntitlement para testes.
 * Uso: npx tsx src/scripts/grant-course-access.ts marianna.yaskara@live.com
 */
import { config } from 'dotenv'

config({ path: '.env' })
config({ path: '.env.local', override: true })

if (
  process.env.DATABASE_URL?.startsWith('prisma+') &&
  process.env.DIRECT_URL
) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const emailArg = process.argv[2]?.toLowerCase().trim()

async function main() {
  if (!emailArg) {
    console.error('Uso: npx tsx src/scripts/grant-course-access.ts <email>')
    process.exit(1)
  }

  const { normalizeLibraryEmail } = await import('@/lib/library/email')
  const { prisma } = await import('@/lib/prisma')
  const email = normalizeLibraryEmail(emailArg)

  const courses = await prisma.catalogProduct.findMany({
    where: { permissionKey: 'VIDEO', active: true },
    select: { id: true, title: true },
    orderBy: { title: 'asc' }
  })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  })

  console.log('E-mail:', email)
  console.log(
    'Usuário:',
    user ? `${user.email} (${user.name ?? 'sem nome'})` : 'não cadastrado ainda'
  )
  console.log('Cursos ativos no catálogo:', courses.length)

  if (courses.length === 0) {
    console.log('Nenhum curso VIDEO ativo encontrado.')
    await prisma.$disconnect()
    return
  }

  let created = 0
  for (const course of courses) {
    const existing = await prisma.productEntitlement.findUnique({
      where: {
        email_catalogProductId: {
          email,
          catalogProductId: course.id
        }
      }
    })

    if (existing) {
      console.log(`  ✓ já liberado: ${course.title}`)
      continue
    }

    await prisma.productEntitlement.create({
      data: {
        email,
        catalogProductId: course.id,
        source: 'manual',
        externalTransactionId: `manual_test_${course.id}`
      }
    })
    console.log(`  ✅ liberado: ${course.title}`)
    created++
  }

  console.log(`\nConcluído. ${created} novo(s) entitlement(s).`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
