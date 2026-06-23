/**
 * Verifica liberação de cursos para um e-mail.
 * Uso: npx tsx src/scripts/check-course-access.ts marianna.yaskara@live.com
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
    console.error('Uso: npx tsx src/scripts/check-course-access.ts <email>')
    process.exit(1)
  }

  const { normalizeLibraryEmail } = await import('@/lib/library/email')
  const { hasComplimentaryAccess } = await import('@/lib/complimentaryAccess')
  const { prisma } = await import('@/lib/prisma')
  const { getProductEntitlementIdsForEmail } = await import(
    '@/lib/purchases/entitlements'
  )

  const email = normalizeLibraryEmail(emailArg)

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  })

  const courses = await prisma.catalogProduct.findMany({
    where: { permissionKey: 'VIDEO', active: true },
    select: { id: true, title: true, freeAccess: true, locale: true, active: true },
    orderBy: { title: 'asc' }
  })

  const entRows = await prisma.productEntitlement.findMany({
    where: { email },
    select: { catalogProductId: true, source: true, createdAt: true }
  })

  const entitled = await getProductEntitlementIdsForEmail(email)

  if (user) {
    const { getProductEntitlementIdsForUser } = await import(
      '@/lib/purchases/entitlements'
    )
    const byUserId = await getProductEntitlementIdsForUser(user)
    console.log('Entitlements via user.id:', [...byUserId])
  }

  console.log('E-mail:', email)
  console.log('Usuário:', user ?? 'não encontrado')
  if (user) {
    console.log(
      'Acesso cortesia (cursos):',
      hasComplimentaryAccess(user.email, user.id) ? 'sim' : 'não'
    )
  }
  console.log('\nCursos ativos:')
  for (const c of courses) {
    const ok =
      c.freeAccess ||
      entitled.has(c.id) ||
      (user ? hasComplimentaryAccess(user.email, user.id) : false)
    console.log(
      `  ${ok ? '✅' : '🔒'} ${c.title} (${c.id}) locale=${c.locale ?? 'todos'}`
    )
  }
  console.log('\nEntitlements no banco:', entRows.length)
  for (const e of entRows) {
    const title = courses.find((c) => c.id === e.catalogProductId)?.title ?? e.catalogProductId
    console.log(`  - ${title} [${e.source}]`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
