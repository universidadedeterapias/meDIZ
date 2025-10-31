// src/scripts/fix-hotmart-plans.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixHotmartPlans() {
  try {
    console.log('🔍 Verificando planos Hotmart no banco...\n')

    // Buscar planos Hotmart
    const hotmartPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { stripePriceId: { contains: 'hotmart' } },
          { stripePriceId: { contains: 'price_hotmart' } }
        ]
      }
    })

    if (hotmartPlans.length === 0) {
      console.log('⚠️ Nenhum plano Hotmart encontrado no banco.')
      console.log('Verifique se os planos foram criados com os códigos corretos:')
      console.log('- Mensal: price_hotmart_mensal (ou variável HOTMART_MONTHLY_PRICE_CODE)')
      console.log('- Anual: price_hotmart_anual (ou variável HOTMART_YEARLY_PRICE_CODE)')
      return
    }

    console.log(`✅ Encontrados ${hotmartPlans.length} planos Hotmart:\n`)

    for (const plan of hotmartPlans) {
      console.log(`📋 Plano: ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   Intervalo atual: ${plan.interval || 'NULL'}`)
      console.log(`   IntervalCount: ${plan.intervalCount || 'NULL'}`)

      // Verificar se o intervalo está correto baseado no stripePriceId
      const isAnual = plan.stripePriceId.toLowerCase().includes('anual') || 
                      plan.stripePriceId.toLowerCase().includes('yearly') ||
                      plan.stripePriceId.toLowerCase().includes('annual')
      const isMensal = plan.stripePriceId.toLowerCase().includes('mensal') || 
                       plan.stripePriceId.toLowerCase().includes('monthly') ||
                       plan.stripePriceId.toLowerCase().includes('mens')

      const expectedInterval = isAnual ? 'YEAR' : isMensal ? 'MONTH' : null

      if (expectedInterval && plan.interval !== expectedInterval) {
        console.log(`   ❌ PROBLEMA: Intervalo deveria ser ${expectedInterval}, mas é ${plan.interval}`)
        console.log(`   🔧 Corrigindo...`)

        await prisma.plan.update({
          where: { id: plan.id },
          data: {
            interval: expectedInterval as 'MONTH' | 'YEAR',
            intervalCount: 1
          }
        })

        console.log(`   ✅ Corrigido! Novo intervalo: ${expectedInterval}\n`)
      } else if (plan.interval === expectedInterval) {
        console.log(`   ✅ Intervalo correto!\n`)
      } else {
        console.log(`   ⚠️ Não foi possível determinar o intervalo esperado baseado no nome\n`)
      }
    }

    console.log('✅ Verificação concluída!')

    // Mostrar resumo
    const allPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { stripePriceId: { contains: 'hotmart' } },
          { stripePriceId: { contains: 'price_hotmart' } }
        ]
      },
      select: {
        name: true,
        stripePriceId: true,
        interval: true
      }
    })

    console.log('\n📊 Resumo dos planos Hotmart:')
    allPlans.forEach(p => {
      console.log(`   - ${p.name} (${p.stripePriceId}): ${p.interval || 'NULL'}`)
    })

  } catch (error) {
    console.error('❌ Erro ao verificar/corrigir planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixHotmartPlans()
    .then(() => {
      console.log('\n✅ Script concluído')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro no script:', error)
      process.exit(1)
    })
}

export default fixHotmartPlans

