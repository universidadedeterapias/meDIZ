// src/scripts/fix-plan-names.ts
// Script para corrigir os nomes dos planos para os nomes corretos
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔧 Corrigindo nomes dos planos...\n')
    
    // Atualizar nome do plano mensal
    const monthlyPlan = await prisma.plan.findUnique({
      where: { stripePriceId: 'price_hotmart_mensal' }
    })

    if (monthlyPlan) {
      await prisma.plan.update({
        where: { id: monthlyPlan.id },
        data: { name: 'Assinatura mensal hotmart' }
      })
      console.log('✅ Plano mensal atualizado: Assinatura mensal hotmart')
    } else {
      console.log('⚠️ Plano mensal (price_hotmart_mensal) não encontrado')
    }

    // Atualizar nome do plano anual
    const yearlyPlan = await prisma.plan.findUnique({
      where: { stripePriceId: 'price_hotmart_anual' }
    })

    if (yearlyPlan) {
      await prisma.plan.update({
        where: { id: yearlyPlan.id },
        data: { name: 'Assinatura anual hotmart' }
      })
      console.log('✅ Plano anual atualizado: Assinatura anual hotmart')
    } else {
      console.log('⚠️ Plano anual (price_hotmart_anual) não encontrado')
    }

    // Verificar resultado
    const updatedPlans = await prisma.plan.findMany({
      where: {
        stripePriceId: {
          in: ['price_hotmart_mensal', 'price_hotmart_anual']
        }
      },
      select: {
        name: true,
        stripePriceId: true,
        interval: true
      }
    })

    console.log('\n📊 Planos atualizados:')
    updatedPlans.forEach(p => {
      console.log(`   - ${p.name} (${p.stripePriceId}) - ${p.interval}`)
    })

    console.log('\n🎉 Nomes corrigidos com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao corrigir nomes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✅ Script concluído')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no script:', error)
    process.exit(1)
  })

