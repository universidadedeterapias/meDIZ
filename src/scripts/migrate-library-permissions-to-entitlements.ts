/**
 * Migra library_permissions (flags booleanas) → product_entitlements granulares.
 *
 * Uso: npm run migrate:library-permissions
 * Dry-run: npm run migrate:library-permissions -- --dry-run
 */
import { prisma } from '@/lib/prisma'
import {
  grantEntitlementsFromLegacyFlags,
  libraryPermissoesFromEntitlements
} from '@/lib/purchases/migrate-legacy-permissions'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const rows = await prisma.libraryPermission.findMany({
    orderBy: { email: 'asc' }
  })

  console.log(
    `${dryRun ? '[DRY-RUN] ' : ''}Migrando ${rows.length} registro(s) de library_permissions...\n`
  )

  let migrated = 0
  let entitlementsTotal = 0

  for (const row of rows) {
    const permissoes = {
      audioterapia: row.audioterapia,
      pdf: row.pdf,
      livro_digital: row.livroDigital
    }

    if (!permissoes.audioterapia && !permissoes.pdf && !permissoes.livro_digital) {
      continue
    }

    if (dryRun) {
      const derived = await libraryPermissoesFromEntitlements(row.email)
      const needs =
        permissoes.audioterapia && !derived.audioterapia ||
        permissoes.pdf && !derived.pdf ||
        permissoes.livro_digital && !derived.livro_digital

      console.log(
        `${needs ? '→' : '○'} ${row.email} pdf=${permissoes.pdf} livro=${permissoes.livro_digital} audio=${permissoes.audioterapia}`
      )
      if (needs) migrated++
      continue
    }

    const result = await grantEntitlementsFromLegacyFlags({
      email: row.email,
      permissoes,
      source: 'migration',
      transactionSuffix: 'library_permissions'
    })

    if (result.entitlementsCreated > 0) {
      console.log(
        `✅ ${row.email}: +${result.entitlementsCreated} entitlement(s)`
      )
      entitlementsTotal += result.entitlementsCreated
      migrated++
    }
  }

  console.log(
    `\n${dryRun ? 'Simulação' : 'Migração'} concluída: ${migrated} usuário(s), ${entitlementsTotal} entitlement(s) criado(s).`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
