/**
 * Corrige planos cujo nome indica ANUAL mas estão com interval MONTH no banco.
 * Depois de rodar, use "Recalcular períodos" no admin para cada usuário afetado.
 *
 * Execução: npm run fix-annual-plans-interval
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const plans = await prisma.plan.findMany({
    where: {
      OR: [
        { name: { contains: 'ANUAL', mode: 'insensitive' } },
        { name: { contains: 'ANNUAL', mode: 'insensitive' } },
        { name: { contains: 'YEARLY', mode: 'insensitive' } }
      ]
    }
  })

  console.log(`Encontrados ${plans.length} plano(s) com nome sugerindo anual.\n`)

  let updated = 0
  for (const plan of plans) {
    if (plan.interval === 'YEAR') {
      console.log(`  OK ${plan.name} (interval já é YEAR)`)
      continue
    }
    await prisma.plan.update({
      where: { id: plan.id },
      data: { interval: 'YEAR', intervalCount: plan.intervalCount ?? 1 }
    })
    console.log(`  Corrigido: ${plan.name} -> interval = YEAR`)
    updated++
  }

  console.log(`\nTotal corrigidos: ${updated}`)
  if (updated > 0) {
    console.log('\nPróximo passo: no admin, abra "Gerenciar Assinaturas" de cada usuário afetado e clique em "Recalcular períodos".')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
