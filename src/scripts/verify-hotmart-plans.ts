// Script para verificar se os planos Hotmart estão corretos no banco
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyPlans() {
  try {
    console.log('🔍 Verificando planos Hotmart no banco de dados...\n')

    // Buscar planos sem usar hotmartId (caso o campo ainda não exista no banco)
    const allPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { hotmartOfferKey: { not: null } },
          { stripePriceId: { contains: 'hotmart' } }
        ]
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Total de planos Hotmart encontrados: ${allPlans.length}\n`)

    const annualPlans = allPlans.filter(p => p.interval === 'YEAR')
    const monthlyPlans = allPlans.filter(p => p.interval === 'MONTH')
    const plansWithoutInterval = allPlans.filter(p => !p.interval)

    console.log(`📅 Planos ANUAIS (YEAR): ${annualPlans.length}`)
    annualPlans.forEach(plan => {
      console.log(`   ✅ ${plan.name}`)
      console.log(`      OfferKey: ${plan.hotmartOfferKey || 'N/A'}`)
      console.log(`      stripePriceId: ${plan.stripePriceId}`)
      console.log(`      Interval: ${plan.interval}`)
      console.log(`      Amount: ${plan.amount} ${plan.currency || 'BRL'}`)
      console.log('')
    })

    console.log(`📅 Planos MENSais (MONTH): ${monthlyPlans.length}`)
    monthlyPlans.forEach(plan => {
      console.log(`   ✅ ${plan.name}`)
      console.log(`      OfferKey: ${plan.hotmartOfferKey || 'N/A'}`)
      console.log(`      stripePriceId: ${plan.stripePriceId}`)
      console.log(`      Interval: ${plan.interval}`)
      console.log('')
    })

    if (plansWithoutInterval.length > 0) {
      console.log(`⚠️  Planos SEM INTERVALO definido: ${plansWithoutInterval.length}`)
      plansWithoutInterval.forEach(plan => {
        console.log(`   ⚠️  ${plan.name} - OfferKey: ${plan.hotmartOfferKey || 'N/A'}`)
      })
      console.log('')
    }

    // Verificar especificamente os planos anuais críticos
    const criticalAnnualOfferKeys = ['jcuheq2m', '2icona9m', 'i7m8kqyw']
    console.log('🔍 Verificando planos anuais críticos:')
    for (const offerKey of criticalAnnualOfferKeys) {
      const plan = await prisma.plan.findUnique({
        where: { hotmartOfferKey: offerKey }
      })
      if (plan) {
        if (plan.interval === 'YEAR') {
          console.log(`   ✅ ${plan.name} (${offerKey}) - Interval: ${plan.interval} ✓`)
        } else {
          console.log(`   ❌ ${plan.name} (${offerKey}) - Interval: ${plan.interval || 'NULL'} ✗ DEVE SER YEAR!`)
        }
      } else {
        console.log(`   ⚠️  Plano com offerKey ${offerKey} não encontrado!`)
      }
    }

    // Verificar planos em dólar (USD)
    console.log('\n💵 Verificando planos em DÓLAR (USD):')
    const usdPlans = allPlans.filter(p => p.currency === 'USD')
    if (usdPlans.length > 0) {
      usdPlans.forEach(plan => {
        const isCorrect = 
          (plan.interval === 'MONTH' && plan.hotmartOfferKey === 'qhs594oc') ||
          (plan.interval === 'YEAR' && plan.hotmartOfferKey === 'i7m8kqyw')
        
        if (isCorrect) {
          console.log(`   ✅ ${plan.name}`)
          console.log(`      OfferKey: ${plan.hotmartOfferKey}`)
          console.log(`      Currency: ${plan.currency || 'NÃO DEFINIDO'} ${plan.currency === 'USD' ? '✓' : '✗'}`)
          console.log(`      Interval: ${plan.interval} ${plan.interval === (plan.hotmartOfferKey === 'i7m8kqyw' ? 'YEAR' : 'MONTH') ? '✓' : '✗'}`)
          console.log(`      Amount: ${plan.amount} ${plan.currency || 'N/A'}`)
        } else {
          console.log(`   ⚠️  ${plan.name} - Verificar configuração!`)
          console.log(`      OfferKey: ${plan.hotmartOfferKey}`)
          console.log(`      Currency: ${plan.currency || 'NÃO DEFINIDO'}`)
          console.log(`      Interval: ${plan.interval || 'NULL'}`)
        }
        console.log('')
      })
    } else {
      console.log('   ⚠️  Nenhum plano em USD encontrado!')
    }

    // Verificar especificamente os planos USD críticos
    const usdOfferKeys = ['qhs594oc', 'i7m8kqyw']
    console.log('🔍 Verificando planos USD críticos:')
    for (const offerKey of usdOfferKeys) {
      const plan = await prisma.plan.findUnique({
        where: { hotmartOfferKey: offerKey }
      })
      if (plan) {
        const expectedInterval = offerKey === 'i7m8kqyw' ? 'YEAR' : 'MONTH'
        const isCorrect = plan.currency === 'USD' && plan.interval === expectedInterval
        
        if (isCorrect) {
          console.log(`   ✅ ${plan.name} (${offerKey})`)
          console.log(`      Currency: ${plan.currency} ✓`)
          console.log(`      Interval: ${plan.interval} ✓`)
        } else {
          console.log(`   ❌ ${plan.name} (${offerKey})`)
          if (plan.currency !== 'USD') {
            console.log(`      Currency: ${plan.currency || 'NULL'} ✗ DEVE SER USD!`)
          }
          if (plan.interval !== expectedInterval) {
            console.log(`      Interval: ${plan.interval || 'NULL'} ✗ DEVE SER ${expectedInterval}!`)
          }
        }
      } else {
        console.log(`   ⚠️  Plano com offerKey ${offerKey} não encontrado!`)
      }
    }

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyPlans()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { verifyPlans }

