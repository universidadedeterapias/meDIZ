// src/scripts/verify-all-hotmart-plans.ts
// Verifica se todos os planos Hotmart estão corretos no banco
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Dados esperados dos planos
const expectedPlans = [
  { hotmartId: 1115304, offerKey: '9dv1fqir', currency: 'BRL', interval: 'MONTH', name: 'Plano Profissional | Mensal' },
  { hotmartId: 1115305, offerKey: '5zwrxs0n', currency: 'BRL', interval: 'MONTH', name: 'PLANO PROFISSIONAL - MENSAL c/ 30D Experiência' },
  { hotmartId: 1163392, offerKey: 'b24v0i4q', currency: 'BRL', interval: 'MONTH', name: 'Plano 1 Real' },
  { hotmartId: 1115306, offerKey: 'jcuheq2m', currency: 'BRL', interval: 'YEAR', name: 'PLANO PROFISSIONAL - ANUAL' },
  { hotmartId: 1115307, offerKey: '2icona9m', currency: 'BRL', interval: 'YEAR', name: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS' },
  { hotmartId: 1197626, offerKey: 'qhs594oc', currency: 'USD', interval: 'MONTH', name: 'Plano Mensal - Dólar' },
  { hotmartId: 1197627, offerKey: 'i7m8kqyw', currency: 'USD', interval: 'YEAR', name: 'Plano Anual - Dólar' }
]

async function main() {
  try {
    console.log('🔍 Verificando todos os planos Hotmart no banco...\n')
    
    let allCorrect = true
    const issues: Array<{ plan: string; issue: string }> = []
    
    for (const expected of expectedPlans) {
      console.log(`\n📋 Verificando: ${expected.name}`)
      console.log(`   hotmartId: ${expected.hotmartId}`)
      console.log(`   offerKey: ${expected.offerKey}`)
      
      // Buscar por hotmartId
      let plan = await prisma.plan.findUnique({
        where: { hotmartId: expected.hotmartId }
      })
      
      // Se não encontrou por hotmartId, buscar por offerKey
      if (!plan) {
        plan = await prisma.plan.findUnique({
          where: { hotmartOfferKey: expected.offerKey }
        })
      }
      
      if (!plan) {
        console.log(`   ❌ PLANO NÃO ENCONTRADO NO BANCO!`)
        allCorrect = false
        issues.push({ plan: expected.name, issue: 'Plano não encontrado no banco' })
        continue
      }
      
      console.log(`   ✅ Plano encontrado`)
      console.log(`      ID: ${plan.id}`)
      console.log(`      Nome: ${plan.name}`)
      console.log(`      hotmartId: ${plan.hotmartId || 'NÃO DEFINIDO'}`)
      console.log(`      offerKey: ${plan.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      console.log(`      Moeda: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`      Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`      Ativo: ${plan.active ? '✅' : '❌'}`)
      
      // Verificações
      if (plan.hotmartId !== expected.hotmartId) {
        console.log(`   ⚠️ AVISO: hotmartId não corresponde (esperado: ${expected.hotmartId}, encontrado: ${plan.hotmartId})`)
        issues.push({ plan: expected.name, issue: `hotmartId incorreto: ${plan.hotmartId} (esperado: ${expected.hotmartId})` })
      }
      
      if (plan.hotmartOfferKey !== expected.offerKey) {
        console.log(`   ⚠️ AVISO: offerKey não corresponde (esperado: ${expected.offerKey}, encontrado: ${plan.hotmartOfferKey})`)
        issues.push({ plan: expected.name, issue: `offerKey incorreto: ${plan.hotmartOfferKey} (esperado: ${expected.offerKey})` })
      }
      
      if (plan.currency?.toUpperCase() !== expected.currency.toUpperCase()) {
        console.log(`   🚨 ERRO CRÍTICO: Moeda incorreta! (esperado: ${expected.currency}, encontrado: ${plan.currency})`)
        allCorrect = false
        issues.push({ plan: expected.name, issue: `Moeda incorreta: ${plan.currency} (esperado: ${expected.currency})` })
      }
      
      if (plan.interval !== expected.interval) {
        console.log(`   🚨 ERRO CRÍTICO: Intervalo incorreto! (esperado: ${expected.interval}, encontrado: ${plan.interval})`)
        allCorrect = false
        issues.push({ plan: expected.name, issue: `Intervalo incorreto: ${plan.interval} (esperado: ${expected.interval})` })
      }
      
      if (!plan.active) {
        console.log(`   ⚠️ AVISO: Plano está inativo`)
        issues.push({ plan: expected.name, issue: 'Plano está inativo' })
      }
    }
    
    console.log('\n\n📊 RESUMO DA VERIFICAÇÃO:')
    if (allCorrect && issues.length === 0) {
      console.log('✅ Todos os planos estão corretos no banco!')
    } else {
      console.log(`❌ Encontrados ${issues.length} problema(s):`)
      issues.forEach(issue => {
        console.log(`   - ${issue.plan}: ${issue.issue}`)
      })
      console.log('\n💡 Execute o script de sincronização para corrigir:')
      console.log('   npm run sync-hotmart-plans')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

