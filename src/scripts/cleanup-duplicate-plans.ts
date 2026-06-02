// src/scripts/cleanup-duplicate-plans.ts
// Script para manter APENAS os 2 planos válidos: price_hotmart_mensal e price_hotmart_anual
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🧹 Limpando planos duplicados...\n')
    
    // Buscar todos os planos
    const allPlans = await prisma.plan.findMany({
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📋 Total de planos encontrados: ${allPlans.length}\n`)

    // Planos válidos que devem ser mantidos
    const validPlans = ['price_hotmart_mensal', 'price_hotmart_anual']
    
    // Verificar se os planos válidos existem
    const validPlansInDb = allPlans.filter(p => validPlans.includes(p.stripePriceId))
    
    if (validPlansInDb.length === 0) {
      console.log('⚠️ ERRO: Nenhum dos planos válidos encontrado no banco!')
      console.log('⚠️ Criando os 2 planos válidos...\n')
      
      // Criar planos válidos se não existirem
      await prisma.plan.createMany({
        data: [
          {
            name: 'Assinatura mensal hotmart',
            stripePriceId: 'price_hotmart_mensal',
            interval: 'MONTH',
            intervalCount: 1,
            active: true,
            amount: 3990, // R$ 39.90
            currency: 'brl'
          },
          {
            name: 'Assinatura anual hotmart',
            stripePriceId: 'price_hotmart_anual',
            interval: 'YEAR',
            intervalCount: 1,
            active: true,
            amount: 35880, // R$ 358.80
            currency: 'brl'
          }
        ],
        skipDuplicates: true
      })
      
      console.log('✅ Planos válidos criados!')
    } else {
      console.log('✅ Planos válidos encontrados:')
      validPlansInDb.forEach(p => {
        console.log(`   - ${p.name} (${p.stripePriceId})`)
      })
    }

    // Desativar todos os planos que NÃO são os 2 válidos
    const plansToDeactivate = allPlans.filter(p => !validPlans.includes(p.stripePriceId))
    
    if (plansToDeactivate.length > 0) {
      console.log(`\n🔒 Desativando ${plansToDeactivate.length} planos inválidos...\n`)
      
      for (const plan of plansToDeactivate) {
        // Verificar se há assinaturas ativas usando esse plano
        const activeSubscriptions = await prisma.subscription.count({
          where: {
            planId: plan.id,
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        })

        if (activeSubscriptions > 0) {
          console.log(`   ⚠️ Plano ${plan.stripePriceId} tem ${activeSubscriptions} assinatura(s) ativa(s) - apenas desativando`)
          await prisma.plan.update({
            where: { id: plan.id },
            data: { active: false }
          })
        } else {
          console.log(`   ✅ Plano ${plan.stripePriceId} - desativado (sem assinaturas ativas)`)
          await prisma.plan.update({
            where: { id: plan.id },
            data: { active: false }
          })
        }
      }
    } else {
      console.log('\n✅ Nenhum plano duplicado encontrado!')
    }

    // Verificar resultado final
    const finalPlans = await prisma.plan.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        stripePriceId: true,
        interval: true,
        active: true
      },
      orderBy: { interval: 'asc' }
    })

    console.log('\n📊 RESUMO FINAL:')
    console.log(`   Total de planos ativos: ${finalPlans.length}`)
    finalPlans.forEach(p => {
      console.log(`   ✅ ${p.name} (${p.stripePriceId}) - ${p.interval}`)
    })

    if (finalPlans.length !== 2) {
      console.log('\n⚠️ ATENÇÃO: Esperado 2 planos ativos, mas encontrados', finalPlans.length)
    } else {
      console.log('\n🎉 Limpeza concluída com sucesso!')
      console.log('✅ Apenas os 2 planos válidos estão ativos.')
    }

  } catch (error) {
    console.error('❌ Erro ao limpar planos:', error)
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

