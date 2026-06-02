// src/scripts/list-all-plans.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Listando TODOS os planos cadastrados no banco...\n')
    
    const allPlans = await prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        stripePriceId: true,
        interval: true,
        intervalCount: true,
        amount: true,
        currency: true,
        active: true,
        createdAt: true
      }
    })

    if (allPlans.length === 0) {
      console.log('⚠️ Nenhum plano encontrado no banco.')
      return
    }

    console.log(`✅ Total de planos: ${allPlans.length}\n`)
    console.log('📋 DETALHES DOS PLANOS:\n')
    
    allPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   Intervalo: ${plan.interval || 'NULL'}`)
      console.log(`   IntervalCount: ${plan.intervalCount || 'NULL'}`)
      console.log(`   Valor: ${plan.amount ? `R$ ${(plan.amount / 100).toFixed(2)}` : 'NULL'}`)
      console.log(`   Moeda: ${plan.currency || 'NULL'}`)
      console.log(`   Ativo: ${plan.active ? '✅' : '❌'}`)
      console.log(`   Criado em: ${plan.createdAt.toISOString()}`)
      console.log('')
    })

    // Agrupar por intervalo
    const monthlyPlans = allPlans.filter(p => p.interval === 'MONTH')
    const yearlyPlans = allPlans.filter(p => p.interval === 'YEAR')
    const otherPlans = allPlans.filter(p => p.interval !== 'MONTH' && p.interval !== 'YEAR')

    console.log('\n📊 RESUMO POR INTERVALO:')
    console.log(`   Mensais (MONTH): ${monthlyPlans.length}`)
    if (monthlyPlans.length > 0) {
      monthlyPlans.forEach(p => {
        console.log(`      - ${p.name} (${p.stripePriceId})`)
      })
    }
    
    console.log(`   Anuais (YEAR): ${yearlyPlans.length}`)
    if (yearlyPlans.length > 0) {
      yearlyPlans.forEach(p => {
        console.log(`      - ${p.name} (${p.stripePriceId})`)
      })
    }
    
    if (otherPlans.length > 0) {
      console.log(`   Outros: ${otherPlans.length}`)
      otherPlans.forEach(p => {
        console.log(`      - ${p.name} (${p.stripePriceId}) - ${p.interval || 'NULL'}`)
      })
    }

  } catch (error) {
    console.error('❌ Erro ao listar planos:', error)
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

