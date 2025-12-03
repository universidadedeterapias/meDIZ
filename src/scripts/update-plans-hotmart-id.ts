// src/scripts/update-plans-hotmart-id.ts
// Atualiza os planos no banco com os hotmartIds corretos baseados no mapeamento oficial
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapeamento oficial dos planos Hotmart (fonte de verdade)
const officialPlans = [
  {
    hotmartId: 1115304,
    name: 'Plano Profissional | Mensal',
    offerKey: '9dv1fqir',
    currency: 'BRL',
    interval: 'MONTH' as const,
    amount: 3990
  },
  {
    hotmartId: 1115305,
    name: 'PLANO PROFISSIONAL - MENSAL c/ 30D Experiência',
    offerKey: '5zwrxs0n',
    currency: 'BRL',
    interval: 'MONTH' as const,
    amount: 3990,
    trialPeriodDays: 30
  },
  {
    hotmartId: 1115306,
    name: 'PLANO PROFISSIONAL - ANUAL',
    offerKey: 'jcuheq2m',
    currency: 'BRL',
    interval: 'YEAR' as const,
    amount: 35880
  },
  {
    hotmartId: 1115307,
    name: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS',
    offerKey: '2icona9m',
    currency: 'BRL',
    interval: 'YEAR' as const,
    amount: 35880,
    trialPeriodDays: 30
  },
  {
    hotmartId: 1163392,
    name: 'Plano 1 Real',
    offerKey: 'b24v0i4q',
    currency: 'BRL',
    interval: 'MONTH' as const,
    amount: 3990,
    trialPeriodDays: 30
  },
  {
    hotmartId: 1197626,
    name: 'Plano Mensal - Dólar',
    offerKey: 'qhs594oc',
    currency: 'USD',
    interval: 'MONTH' as const,
    amount: 990
  },
  {
    hotmartId: 1197627,
    name: 'Plano Anual - Dólar',
    offerKey: 'i7m8kqyw',
    currency: 'USD',
    interval: 'YEAR' as const,
    amount: 9700
  }
]

async function main() {
  try {
    console.log('🔄 Atualizando planos com hotmartIds corretos...\n')
    
    let updated = 0
    let created = 0
    let errors = 0
    
    for (const officialPlan of officialPlans) {
      console.log(`\n📋 Processando: ${officialPlan.name}`)
      console.log(`   hotmartId: ${officialPlan.hotmartId}`)
      console.log(`   offerKey: ${officialPlan.offerKey}`)
      
      // Buscar plano existente por offerKey ou stripePriceId
      let existingPlan = await prisma.plan.findFirst({
        where: {
          OR: [
            { hotmartOfferKey: officialPlan.offerKey },
            { stripePriceId: officialPlan.offerKey }
          ]
        }
      })
      
      if (existingPlan) {
        console.log(`   ✅ Plano encontrado: ${existingPlan.name}`)
        console.log(`      ID atual: ${existingPlan.id}`)
        console.log(`      hotmartId atual: ${existingPlan.hotmartId || 'NÃO DEFINIDO'}`)
        console.log(`      Moeda atual: ${existingPlan.currency || 'NÃO DEFINIDA'}`)
        console.log(`      Intervalo atual: ${existingPlan.interval || 'NÃO DEFINIDO'}`)
        
        // Verificar se precisa atualizar
        const needsUpdate = 
          existingPlan.hotmartId !== officialPlan.hotmartId ||
          existingPlan.currency?.toUpperCase() !== officialPlan.currency.toUpperCase() ||
          existingPlan.interval !== officialPlan.interval ||
          existingPlan.name !== officialPlan.name
        
        if (needsUpdate) {
          console.log(`   🔄 Atualizando plano...`)
          
          try {
            await prisma.plan.update({
              where: { id: existingPlan.id },
              data: {
                hotmartId: officialPlan.hotmartId,
                name: officialPlan.name,
                currency: officialPlan.currency,
                interval: officialPlan.interval,
                amount: officialPlan.amount,
                trialPeriodDays: officialPlan.trialPeriodDays ?? null,
                hotmartOfferKey: officialPlan.offerKey,
                stripePriceId: officialPlan.offerKey, // Manter compatibilidade
                active: true
              }
            })
            
            console.log(`   ✅ Plano atualizado com sucesso!`)
            updated++
          } catch (error) {
            console.error(`   ❌ Erro ao atualizar:`, error)
            errors++
          }
        } else {
          console.log(`   ✅ Plano já está correto`)
        }
      } else {
        // Plano não existe, criar novo
        console.log(`   ➕ Plano não encontrado, criando novo...`)
        
        try {
          await prisma.plan.create({
            data: {
              hotmartId: officialPlan.hotmartId,
              name: officialPlan.name,
              currency: officialPlan.currency,
              interval: officialPlan.interval,
              amount: officialPlan.amount,
              trialPeriodDays: officialPlan.trialPeriodDays ?? null,
              hotmartOfferKey: officialPlan.offerKey,
              stripePriceId: officialPlan.offerKey,
              active: true
            }
          })
          
          console.log(`   ✅ Plano criado com sucesso!`)
          created++
        } catch (error) {
          console.error(`   ❌ Erro ao criar:`, error)
          errors++
        }
      }
    }
    
    console.log('\n\n📊 RESUMO:')
    console.log(`   Planos atualizados: ${updated}`)
    console.log(`   Planos criados: ${created}`)
    console.log(`   Erros: ${errors}`)
    console.log(`   Total processado: ${officialPlans.length}`)
    
    // Verificar se todos os planos têm hotmartId agora
    console.log('\n🔍 Verificando planos Hotmart no banco...\n')
    const allHotmartPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { hotmartOfferKey: { not: null } },
          { hotmartId: { not: null } }
        ]
      },
      orderBy: { hotmartId: 'asc' }
    })
    
    console.log(`📊 Total de planos Hotmart no banco: ${allHotmartPlans.length}\n`)
    
    allHotmartPlans.forEach(plan => {
      console.log(`   ${plan.hotmartId || 'SEM ID'} - ${plan.name}`)
      console.log(`      Moeda: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`      Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`      OfferKey: ${plan.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      console.log('')
    })
    
    const plansWithoutId = allHotmartPlans.filter(p => !p.hotmartId)
    if (plansWithoutId.length > 0) {
      console.log(`⚠️ ${plansWithoutId.length} plano(s) sem hotmartId:`)
      plansWithoutId.forEach(p => {
        console.log(`   - ${p.name} (${p.hotmartOfferKey || p.stripePriceId})`)
      })
    } else {
      console.log('✅ Todos os planos têm hotmartId definido!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
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

