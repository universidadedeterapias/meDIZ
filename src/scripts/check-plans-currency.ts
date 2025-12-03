// src/scripts/check-plans-currency.ts
// Verifica planos Hotmart e suas moedas
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Verificando planos Hotmart no banco...\n')
    
    // Buscar todos os planos Hotmart
    const plans = await prisma.plan.findMany({
      where: {
        OR: [
          { hotmartOfferKey: { not: null } },
          { stripePriceId: { in: ['9dv1fqir', '5zwrxs0n', 'b24v0i4q', 'jcuheq2m', '2icona9m', 'qhs594oc', 'i7m8kqyw'] } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`📊 Total de planos Hotmart encontrados: ${plans.length}\n`)
    
    if (plans.length === 0) {
      console.log('❌ Nenhum plano Hotmart encontrado!')
      console.log('💡 Execute: npm run sync-hotmart-plans')
      return
    }
    
    const expectedPlans = [
      { hotmartId: 1115304, offerKey: '9dv1fqir', currency: 'BRL', interval: 'MONTH' },
      { hotmartId: 1115305, offerKey: '5zwrxs0n', currency: 'BRL', interval: 'MONTH' },
      { hotmartId: 1163392, offerKey: 'b24v0i4q', currency: 'BRL', interval: 'MONTH' },
      { hotmartId: 1115306, offerKey: 'jcuheq2m', currency: 'BRL', interval: 'YEAR' },
      { hotmartId: 1115307, offerKey: '2icona9m', currency: 'BRL', interval: 'YEAR' },
      { hotmartId: 1197626, offerKey: 'qhs594oc', currency: 'USD', interval: 'MONTH' },
      { hotmartId: 1197627, offerKey: 'i7m8kqyw', currency: 'USD', interval: 'YEAR' }
    ]
    
    console.log('📋 PLANOS NO BANCO:\n')
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   hotmartOfferKey: ${plan.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      console.log(`   hotmartId: ${plan.hotmartId || 'NÃO DEFINIDO'}`)
      console.log(`   Moeda: ${plan.currency || 'NÃO DEFINIDA'} ${plan.currency && plan.currency.toUpperCase() !== 'BRL' && plan.currency.toUpperCase() !== 'USD' ? '⚠️' : ''}`)
      console.log(`   Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`   Valor: ${plan.amount ? `${plan.currency || 'BRL'} ${(plan.amount / 100).toFixed(2)}` : 'NÃO DEFINIDO'}`)
      console.log(`   Ativo: ${plan.active ? '✅' : '❌'}`)
      
      // Verificar se corresponde ao esperado
      const expected = expectedPlans.find(e => 
        e.offerKey === plan.hotmartOfferKey || 
        e.hotmartId === plan.hotmartId ||
        e.offerKey === plan.stripePriceId
      )
      
      if (expected) {
        if (plan.currency?.toUpperCase() !== expected.currency.toUpperCase()) {
          console.log(`   🚨 ERRO: Moeda incorreta! Esperado: ${expected.currency}, Encontrado: ${plan.currency}`)
        }
        if (plan.interval !== expected.interval) {
          console.log(`   🚨 ERRO: Intervalo incorreto! Esperado: ${expected.interval}, Encontrado: ${plan.interval}`)
        }
      }
      console.log('')
    })
    
    // Verificar planos faltando
    console.log('\n🔍 Verificando planos faltando...\n')
    const foundOfferKeys = plans.map(p => p.hotmartOfferKey || p.stripePriceId).filter(Boolean)
    const missingPlans = expectedPlans.filter(e => !foundOfferKeys.includes(e.offerKey))
    
    if (missingPlans.length > 0) {
      console.log(`⚠️ ${missingPlans.length} plano(s) faltando:`)
      missingPlans.forEach(p => {
        console.log(`   - ${p.offerKey} (hotmartId: ${p.hotmartId}, Moeda: ${p.currency})`)
      })
    } else {
      console.log('✅ Todos os planos esperados estão no banco')
    }
    
    // Verificar planos com moeda incorreta
    console.log('\n🔍 Verificando moedas...\n')
    const wrongCurrency = plans.filter(plan => {
      const expected = expectedPlans.find(e => 
        e.offerKey === plan.hotmartOfferKey || 
        e.hotmartId === plan.hotmartId ||
        e.offerKey === plan.stripePriceId
      )
      return expected && plan.currency?.toUpperCase() !== expected.currency.toUpperCase()
    })
    
    if (wrongCurrency.length > 0) {
      console.log(`🚨 ${wrongCurrency.length} plano(s) com moeda incorreta:`)
      wrongCurrency.forEach(plan => {
        const expected = expectedPlans.find(e => 
          e.offerKey === plan.hotmartOfferKey || 
          e.hotmartId === plan.hotmartId ||
          e.offerKey === plan.stripePriceId
        )
        console.log(`   - ${plan.name}`)
        console.log(`     Moeda atual: ${plan.currency}`)
        console.log(`     Moeda esperada: ${expected?.currency}`)
      })
      console.log('\n💡 Execute: npm run sync-hotmart-plans para corrigir')
    } else {
      console.log('✅ Todas as moedas estão corretas')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
    if (error instanceof Error && error.message.includes('hotmartId')) {
      console.error('\n⚠️ O campo hotmartId pode não existir no banco.')
      console.error('💡 Execute uma migration ou atualize o schema do Prisma.')
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

