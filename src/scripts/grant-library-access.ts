/**
 * Concede acesso total à biblioteca para um e-mail (testes locais).
 * Uso: npm run grant:library-access -- marianna.yaskara@live.com
 * Sem argumento, libera todas as contas marianna.yaskara* encontradas no banco.
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

const emailArg = process.argv[2]?.toLowerCase().trim()

async function main() {
  const { upsertLibraryPermissions, getLibraryPermissionsByEmail } =
    await import('@/lib/library/permissions')
  const { prisma } = await import('@/lib/prisma')

  const targets = emailArg
    ? [{ email: emailArg, name: 'Marianna' as string | null }]
    : (
        await prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: 'marianna.yaskara', mode: 'insensitive' } },
              { email: { equals: 'marianna.sales@mediz.com', mode: 'insensitive' } }
            ]
          },
          select: { email: true, name: true }
        })
      ).map((user) => ({
        email: user.email.toLowerCase().trim(),
        name: user.name
      }))

  if (targets.length === 0) {
    console.error('Nenhum e-mail para liberar.')
    process.exit(1)
  }

  for (const target of targets) {
    const row = await upsertLibraryPermissions(target.email, target.name ?? 'Marianna', {
      audioterapia: true,
      pdf: true,
      livro_digital: true
    })

    const perms = await getLibraryPermissionsByEmail(target.email)
    const user = await prisma.user.findUnique({
      where: { email: target.email },
      select: { id: true, email: true, mustResetPassword: true }
    })

    console.log('✅ Biblioteca liberada para:', target.email)
    console.log('   Registro:', row)
    console.log('   Permissões:', perms)
    if (user) {
      console.log('   Usuário encontrado:', user.email, `(${user.id})`)
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
    console.log('')
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
