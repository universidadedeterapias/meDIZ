/**
 * Concede acesso total à biblioteca para um e-mail (testes locais).
 * Uso: npx tsx src/scripts/grant-library-access.ts marianna.yaskara@live.com
 */
import { config } from 'dotenv'

config({ path: '.env' })
config({ path: '.env.local', override: true })

// Prisma Accelerate (prisma+postgres://) não funciona em scripts locais
if (
  process.env.DATABASE_URL?.startsWith('prisma+') &&
  process.env.DIRECT_URL
) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const email = (process.argv[2] ?? 'marianna.yaskara@live.com').toLowerCase().trim()

async function main() {
  const { upsertLibraryPermissions, getLibraryPermissionsByEmail } =
    await import('@/lib/library/permissions')
  const { prisma } = await import('@/lib/prisma')

  const row = await upsertLibraryPermissions(email, 'Marianna', {
    audioterapia: true,
    pdf: true,
    livro_digital: true
  })

  const perms = await getLibraryPermissionsByEmail(email)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, mustResetPassword: true }
  })

  console.log('✅ Biblioteca liberada para:', email)
  console.log('   Registro:', row)
  console.log('   Permissões:', perms)
  if (user) {
    console.log('   Usuário encontrado:', user.email)
    if (user.mustResetPassword) {
      await prisma.user.update({
        where: { id: user.id },
        data: { mustResetPassword: false, temporaryPasswordPlain: null }
      })
      console.log('   ✅ mustResetPassword desativado para teste')
    }
  } else {
    console.log(
      '   ⚠️ Nenhum usuário com esse e-mail — faça login/cadastro com o mesmo e-mail.'
    )
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
