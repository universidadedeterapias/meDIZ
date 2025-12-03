// src/scripts/fix-existing-plan-names.ts
// Script para corrigir nomes dos planos existentes no banco de dados
// baseado nos dados corretos do sync-hotmart-plans.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mesmos dados do sync-hotmart-plans.ts com os nomes corretos
const correctPlanNames: Record<number, string> = {
  1115304: 'Plano Profissional | Mensal',
  1115305: 'PLANO PROFISSIONAL - MENSAL c/ 30D Experiência',
  1163392: 'Plano 1 Real',
  1115306: 'PLANO PROFISSIONAL - ANUAL',
  1115307: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS',
  1197626: 'Plano Mensal - Dólar',
  1197627: 'Plano Anual - Dólar'
}

async function fixPlanNames() {
  try {
    console.log('🔄 Iniciando correção de nomes dos planos Hotmart...\n')

    // Buscar todos os planos Hotmart que têm hotmartId
    const hotmartPlans = await prisma.plan.findMany({
      where: {
        hotmartId: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        hotmartId: true,
        hotmartOfferKey: true,
        stripePriceId: true
      }
    })

    console.log(`📊 Encontrados ${hotmartPlans.length} planos Hotmart no banco\n`)

    let updated = 0
    let skipped = 0
    let notFound = 0

    for (const plan of hotmartPlans) {
      if (!plan.hotmartId) {
        console.log(`⏭️  Plano ${plan.id} não tem hotmartId, ignorando`)
        skipped++
        continue
      }

      const correctName = correctPlanNames[plan.hotmartId]

      if (!correctName) {
        console.log(`⚠️  Nome correto não encontrado para hotmartId ${plan.hotmartId}`)
        console.log(`   Plano atual: ${plan.name}`)
        console.log(`   OfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
        notFound++
        continue
      }

      // Verificar se o nome precisa ser atualizado
      if (plan.name === correctName) {
        console.log(`✅ Plano ${plan.hotmartId} já está correto: "${plan.name}"`)
        skipped++
        continue
      }

      // Atualizar o nome do plano
      try {
        await prisma.plan.update({
          where: { id: plan.id },
          data: { name: correctName }
        })
        console.log(`🔄 Atualizado plano ${plan.hotmartId}:`)
        console.log(`   Nome antigo: "${plan.name}"`)
        console.log(`   Nome novo:   "${correctName}"`)
        console.log(`   OfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
        updated++
      } catch (error) {
        console.error(`❌ Erro ao atualizar plano ${plan.hotmartId}:`, error)
      }
    }

    console.log('\n📈 Resumo:')
    console.log(`   🔄 Atualizados: ${updated}`)
    console.log(`   ✅ Já corretos: ${skipped}`)
    console.log(`   ⚠️  Sem nome correto: ${notFound}`)
    console.log('\n🎉 Correção concluída!')

    // Mostrar planos que não foram encontrados no mapeamento
    if (notFound > 0) {
      console.log('\n⚠️  ATENÇÃO: Alguns planos não foram encontrados no mapeamento.')
      console.log('   Verifique se os hotmartIds estão corretos no sync-hotmart-plans.ts')
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir nomes dos planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixPlanNames()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { fixPlanNames }


