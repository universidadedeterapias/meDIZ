// Script para verificar se os planos têm hotmartId no banco
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// IDs esperados da Hotmart (baseado nos dados fornecidos)
const expectedHotmartIds = [
  1115304, // Plano Profissional | Mensal
  1115305, // PLANO PROFISSIONAL - MENSAL c/ 30D Experiência
  1115306, // PLANO PROFISSIONAL - ANUAL
  1115307, // PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS
  1163392, // Plano 1 Real
  1197626, // Plano Mensal - Dólar
  1197627  // Plano Anual - Dólar
]

async function checkHotmartIds() {
  try {
    console.log('🔍 Verificando se os planos têm hotmartId no banco de dados...\n')

    // Buscar todos os planos Hotmart
    const allHotmartPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { hotmartId: { not: null } },
          { hotmartOfferKey: { not: null } },
          { stripePriceId: { contains: 'hotmart' } }
        ]
      },
      orderBy: { hotmartId: 'asc' }
    })

    console.log(`📊 Total de planos Hotmart encontrados: ${allHotmartPlans.length}\n`)

    // Verificar quais têm hotmartId
    const plansWithId = allHotmartPlans.filter(p => p.hotmartId !== null)
    const plansWithoutId = allHotmartPlans.filter(p => p.hotmartId === null)

    console.log(`✅ Planos COM hotmartId: ${plansWithId.length}`)
    plansWithId.forEach(plan => {
      console.log(`   • ID: ${plan.hotmartId} | Nome: ${plan.name}`)
      console.log(`     OfferKey: ${plan.hotmartOfferKey || 'N/A'}`)
      console.log(`     StripePriceId: ${plan.stripePriceId}`)
      console.log(`     Moeda: ${plan.currency || 'N/A'}`)
      console.log(`     Intervalo: ${plan.interval || 'N/A'}`)
      console.log('')
    })

    if (plansWithoutId.length > 0) {
      console.log(`\n⚠️  Planos SEM hotmartId: ${plansWithoutId.length}`)
      plansWithoutId.forEach(plan => {
        console.log(`   • Nome: ${plan.name}`)
        console.log(`     OfferKey: ${plan.hotmartOfferKey || 'N/A'}`)
        console.log(`     StripePriceId: ${plan.stripePriceId}`)
        console.log('')
      })
    }

    // Verificar se todos os IDs esperados estão no banco
    console.log('\n🔍 Verificando IDs esperados da Hotmart:\n')
    const missingIds: number[] = []
    
    for (const expectedId of expectedHotmartIds) {
      const plan = await prisma.plan.findUnique({
        where: { hotmartId: expectedId }
      })
      
      if (plan) {
        console.log(`✅ ID ${expectedId}: ${plan.name}`)
      } else {
        console.log(`❌ ID ${expectedId}: NÃO ENCONTRADO`)
        missingIds.push(expectedId)
      }
    }

    // Resumo final
    console.log('\n📈 RESUMO:')
    console.log(`   Total de planos Hotmart: ${allHotmartPlans.length}`)
    console.log(`   Planos COM hotmartId: ${plansWithId.length}`)
    console.log(`   Planos SEM hotmartId: ${plansWithoutId.length}`)
    console.log(`   IDs esperados encontrados: ${expectedHotmartIds.length - missingIds.length}/${expectedHotmartIds.length}`)
    
    if (missingIds.length > 0) {
      console.log(`\n⚠️  IDs faltando: ${missingIds.join(', ')}`)
      console.log('💡 Execute: npm run sync-hotmart-plans para sincronizar')
    } else {
      console.log('\n✅ Todos os IDs esperados estão no banco!')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkHotmartIds()
  .then(() => {
    console.log('\n✅ Verificação concluída')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })


