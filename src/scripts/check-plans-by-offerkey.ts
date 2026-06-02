// Script para verificar planos por offerKey (funciona mesmo sem hotmartId no banco)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Todos os planos esperados da Hotmart
const expectedPlans = [
  { id: 1115304, name: 'Plano Profissional | Mensal', offerKey: '9dv1fqir', currency: 'BRL', interval: 'MONTH' },
  { id: 1115305, name: 'PLANO PROFISSIONAL - MENSAL c/ 30D Experiência', offerKey: '5zwrxs0n', currency: 'BRL', interval: 'MONTH' },
  { id: 1115306, name: 'PLANO PROFISSIONAL - ANUAL', offerKey: 'jcuheq2m', currency: 'BRL', interval: 'YEAR' },
  { id: 1115307, name: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS', offerKey: '2icona9m', currency: 'BRL', interval: 'YEAR' },
  { id: 1163392, name: 'Plano 1 Real', offerKey: 'b24v0i4q', currency: 'BRL', interval: 'MONTH' },
  { id: 1197626, name: 'Plano Mensal - Dólar', offerKey: 'qhs594oc', currency: 'USD', interval: 'MONTH' },
  { id: 1197627, name: 'Plano Anual - Dólar', offerKey: 'i7m8kqyw', currency: 'USD', interval: 'YEAR' }
]

async function checkPlans() {
  try {
    console.log('🔍 Verificando planos Hotmart no banco (por offerKey)...\n')
    console.log(`📋 Total de planos esperados: ${expectedPlans.length}\n`)

    const results: Array<{
      expected: typeof expectedPlans[0]
      found: boolean
      plan?: any
      hasHotmartId?: boolean
    }> = []

    for (const expected of expectedPlans) {
      console.log(`\n📋 Verificando: ${expected.name}`)
      console.log(`   ID esperado: ${expected.id}`)
      console.log(`   OfferKey: ${expected.offerKey}`)
      console.log(`   Moeda: ${expected.currency}`)
      console.log(`   Intervalo: ${expected.interval}`)

      // Buscar por offerKey
      const plan = await prisma.plan.findUnique({
        where: { hotmartOfferKey: expected.offerKey }
      })

      if (!plan) {
        console.log(`   ❌ PLANO NÃO ENCONTRADO NO BANCO!`)
        results.push({ expected, found: false })
        continue
      }

      console.log(`   ✅ Plano encontrado`)
      console.log(`      ID no banco: ${plan.id}`)
      console.log(`      Nome no banco: ${plan.name}`)
      console.log(`      OfferKey: ${plan.hotmartOfferKey}`)
      console.log(`      Moeda: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`      Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      
      // Tentar verificar hotmartId (pode não existir ainda)
      let hasHotmartId = false
      try {
        const planWithId = await prisma.plan.findUnique({
          where: { hotmartOfferKey: expected.offerKey },
          select: { hotmartId: true }
        })
        hasHotmartId = planWithId?.hotmartId !== null && planWithId?.hotmartId !== undefined
        if (hasHotmartId) {
          console.log(`      hotmartId: ${planWithId?.hotmartId}`)
          if (planWithId?.hotmartId !== expected.id) {
            console.log(`      ⚠️  hotmartId não corresponde! Esperado: ${expected.id}`)
          }
        } else {
          console.log(`      ⚠️  hotmartId: NÃO DEFINIDO`)
        }
      } catch (e) {
        console.log(`      ⚠️  Campo hotmartId não existe no banco ainda`)
      }

      results.push({
        expected,
        found: true,
        plan,
        hasHotmartId
      })
    }

    // Resumo
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 RESUMO')
    console.log('='.repeat(60))

    const found = results.filter(r => r.found).length
    const notFound = results.filter(r => !r.found).length
    const withHotmartId = results.filter(r => r.hasHotmartId).length

    console.log(`\n✅ Planos encontrados: ${found}/${expectedPlans.length}`)
    console.log(`❌ Planos não encontrados: ${notFound}/${expectedPlans.length}`)
    console.log(`🆔 Planos com hotmartId: ${withHotmartId}/${found}`)

    // Planos em dólar
    const dollarPlans = results.filter(r => r.expected.currency === 'USD')
    console.log('\n💵 Planos em DÓLAR:')
    dollarPlans.forEach(r => {
      if (r.found) {
        const idStatus = r.hasHotmartId ? '✅' : '⚠️'
        console.log(`   ${idStatus} ID ${r.expected.id}: ${r.plan?.name || r.expected.name}`)
        if (!r.hasHotmartId) {
          console.log(`      ⚠️  hotmartId não está definido no banco`)
        }
      } else {
        console.log(`   ❌ ID ${r.expected.id}: ${r.expected.name} - NÃO ENCONTRADO`)
      }
    })

    if (notFound > 0) {
      console.log('\n❌ Planos NÃO encontrados:')
      results.filter(r => !r.found).forEach(r => {
        console.log(`   - ID ${r.expected.id}: ${r.expected.name} (OfferKey: ${r.expected.offerKey})`)
      })
      console.log('\n💡 Execute: npm run sync-hotmart-plans para sincronizar')
    }

    if (withHotmartId < found) {
      console.log('\n⚠️  Alguns planos não têm hotmartId definido')
      console.log('💡 Execute: npx prisma db push para criar a coluna hotmartId')
      console.log('💡 Depois execute: npm run sync-hotmart-plans para preencher os IDs')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkPlans()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })


