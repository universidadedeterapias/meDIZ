// Script para verificar se TODOS os IDs da Hotmart estão no banco
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Todos os planos esperados da Hotmart (baseado nos dados fornecidos)
const expectedPlans = [
  {
    id: 1115304,
    name: 'Plano Profissional | Mensal',
    offerKey: '9dv1fqir',
    currency: 'BRL',
    interval: 'MONTH'
  },
  {
    id: 1115305,
    name: 'PLANO PROFISSIONAL - MENSAL c/ 30D Experiência',
    offerKey: '5zwrxs0n',
    currency: 'BRL',
    interval: 'MONTH'
  },
  {
    id: 1115306,
    name: 'PLANO PROFISSIONAL - ANUAL',
    offerKey: 'jcuheq2m',
    currency: 'BRL',
    interval: 'YEAR'
  },
  {
    id: 1115307,
    name: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS',
    offerKey: '2icona9m',
    currency: 'BRL',
    interval: 'YEAR'
  },
  {
    id: 1163392,
    name: 'Plano 1 Real',
    offerKey: 'b24v0i4q',
    currency: 'BRL',
    interval: 'MONTH'
  },
  {
    id: 1197626,
    name: 'Plano Mensal - Dólar',
    offerKey: 'qhs594oc',
    currency: 'USD',
    interval: 'MONTH'
  },
  {
    id: 1197627,
    name: 'Plano Anual - Dólar',
    offerKey: 'i7m8kqyw',
    currency: 'USD',
    interval: 'YEAR'
  }
]

async function verifyAllIds() {
  try {
    console.log('🔍 Verificando se TODOS os IDs da Hotmart estão no banco...\n')
    console.log(`📋 Total de planos esperados: ${expectedPlans.length}\n`)

    const results: Array<{
      expected: typeof expectedPlans[0]
      found: boolean
      plan?: any
      issues: string[]
    }> = []

    for (const expected of expectedPlans) {
      console.log(`\n📋 Verificando: ${expected.name}`)
      console.log(`   ID: ${expected.id}`)
      console.log(`   OfferKey: ${expected.offerKey}`)
      console.log(`   Moeda: ${expected.currency}`)
      console.log(`   Intervalo: ${expected.interval}`)

      // Buscar por hotmartId
      let plan = await prisma.plan.findUnique({
        where: { hotmartId: expected.id }
      })

      // Se não encontrou por hotmartId, buscar por offerKey
      if (!plan) {
        plan = await prisma.plan.findUnique({
          where: { hotmartOfferKey: expected.offerKey }
        })
      }

      const issues: string[] = []

      if (!plan) {
        console.log(`   ❌ PLANO NÃO ENCONTRADO NO BANCO!`)
        results.push({ expected, found: false, issues: ['Plano não encontrado'] })
        continue
      }

      console.log(`   ✅ Plano encontrado`)
      console.log(`      ID no banco: ${plan.id}`)
      console.log(`      Nome no banco: ${plan.name}`)
      console.log(`      hotmartId: ${plan.hotmartId || 'NÃO DEFINIDO'}`)
      console.log(`      offerKey: ${plan.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      console.log(`      Moeda: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`      Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)

      // Verificações
      if (plan.hotmartId !== expected.id) {
        issues.push(`hotmartId incorreto: ${plan.hotmartId} (esperado: ${expected.id})`)
        console.log(`   ⚠️  hotmartId não corresponde!`)
      }

      if (plan.hotmartOfferKey !== expected.offerKey) {
        issues.push(`offerKey incorreto: ${plan.hotmartOfferKey} (esperado: ${expected.offerKey})`)
        console.log(`   ⚠️  offerKey não corresponde!`)
      }

      if (plan.currency?.toUpperCase() !== expected.currency) {
        issues.push(`moeda incorreta: ${plan.currency} (esperado: ${expected.currency})`)
        console.log(`   ⚠️  Moeda não corresponde!`)
      }

      if (plan.interval !== expected.interval) {
        issues.push(`intervalo incorreto: ${plan.interval} (esperado: ${expected.interval})`)
        console.log(`   ⚠️  Intervalo não corresponde!`)
      }

      // Verificar se o nome corresponde (pode ter pequenas diferenças, mas deve ser similar)
      const nameMatch = plan.name.toLowerCase().includes(expected.name.toLowerCase().substring(0, 10)) ||
                       expected.name.toLowerCase().includes(plan.name.toLowerCase().substring(0, 10))
      
      if (!nameMatch && plan.name !== expected.name) {
        console.log(`   ⚠️  Nome pode não corresponder completamente`)
        console.log(`      Esperado: "${expected.name}"`)
        console.log(`      No banco: "${plan.name}"`)
      }

      results.push({
        expected,
        found: true,
        plan,
        issues
      })
    }

    // Resumo final
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 RESUMO FINAL')
    console.log('='.repeat(60))

    const found = results.filter(r => r.found).length
    const notFound = results.filter(r => !r.found).length
    const withIssues = results.filter(r => r.issues.length > 0).length

    console.log(`\n✅ Planos encontrados: ${found}/${expectedPlans.length}`)
    console.log(`❌ Planos não encontrados: ${notFound}/${expectedPlans.length}`)
    console.log(`⚠️  Planos com problemas: ${withIssues}/${expectedPlans.length}`)

    if (notFound > 0) {
      console.log('\n❌ Planos NÃO encontrados:')
      results.filter(r => !r.found).forEach(r => {
        console.log(`   - ID ${r.expected.id}: ${r.expected.name}`)
      })
      console.log('\n💡 Execute: npm run sync-hotmart-plans para sincronizar')
    }

    if (withIssues > 0) {
      console.log('\n⚠️  Planos com problemas:')
      results.filter(r => r.issues.length > 0).forEach(r => {
        console.log(`   - ID ${r.expected.id}: ${r.expected.name}`)
        r.issues.forEach(issue => console.log(`     • ${issue}`))
      })
    }

    // Verificar planos em dólar especificamente
    const dollarPlans = results.filter(r => r.expected.currency === 'USD')
    console.log('\n💵 Planos em DÓLAR:')
    dollarPlans.forEach(r => {
      if (r.found) {
        console.log(`   ✅ ID ${r.expected.id}: ${r.plan?.name || r.expected.name}`)
        if (r.issues.length > 0) {
          r.issues.forEach(issue => console.log(`      ⚠️  ${issue}`))
        }
      } else {
        console.log(`   ❌ ID ${r.expected.id}: ${r.expected.name} - NÃO ENCONTRADO`)
      }
    })

    if (found === expectedPlans.length && withIssues === 0) {
      console.log('\n🎉 Todos os planos estão corretos no banco!')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyAllIds()
  .then(() => {
    console.log('\n✅ Verificação concluída')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })


