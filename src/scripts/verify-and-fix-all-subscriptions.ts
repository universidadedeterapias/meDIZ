// src/scripts/verify-and-fix-all-subscriptions.ts
// Verifica e corrige todas as assinaturas Hotmart baseado no hotmartId
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapeamento correto: hotmartId -> dados esperados
const correctPlans: Record<number, { currency: string; interval: string; offerKey: string }> = {
  1115304: { currency: 'BRL', interval: 'MONTH', offerKey: '9dv1fqir' },
  1115305: { currency: 'BRL', interval: 'MONTH', offerKey: '5zwrxs0n' },
  1163392: { currency: 'BRL', interval: 'MONTH', offerKey: 'b24v0i4q' },
  1115306: { currency: 'BRL', interval: 'YEAR', offerKey: 'jcuheq2m' },
  1115307: { currency: 'BRL', interval: 'YEAR', offerKey: '2icona9m' },
  1197626: { currency: 'USD', interval: 'MONTH', offerKey: 'qhs594oc' },
  1197627: { currency: 'USD', interval: 'YEAR', offerKey: 'i7m8kqyw' }
}

async function main() {
  try {
    console.log('🔍 Verificando planos e assinaturas...\n')
    
    // 1. Verificar se os planos têm hotmartId
    console.log('📋 Verificando planos no banco...\n')
    const allPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { hotmartOfferKey: { not: null } },
          { stripePriceId: { in: ['9dv1fqir', '5zwrxs0n', 'b24v0i4q', 'jcuheq2m', '2icona9m', 'qhs594oc', 'i7m8kqyw'] } }
        ]
      }
    })
    
    console.log(`Total de planos encontrados: ${allPlans.length}\n`)
    
    const plansWithoutId: Array<{ id: string; name: string; offerKey: string | null }> = []
    const plansWithWrongId: Array<{ id: string; name: string; hotmartId: number | null; issue: string }> = []
    
    for (const plan of allPlans) {
      const offerKey = plan.hotmartOfferKey || plan.stripePriceId
      const expectedPlan = Object.entries(correctPlans).find(([_, data]) => data.offerKey === offerKey)
      
      if (!expectedPlan) {
        console.log(`⚠️ Plano não encontrado no mapeamento: ${plan.name} (${offerKey})`)
        continue
      }
      
      const expectedHotmartId = parseInt(expectedPlan[0])
      const expectedData = expectedPlan[1]
      
      if (!plan.hotmartId) {
        plansWithoutId.push({ id: plan.id, name: plan.name, offerKey: offerKey || null })
        console.log(`❌ Plano sem hotmartId: ${plan.name}`)
        console.log(`   OfferKey: ${offerKey}`)
        console.log(`   Esperado: hotmartId ${expectedHotmartId}`)
      } else if (plan.hotmartId !== expectedHotmartId) {
        plansWithWrongId.push({ id: plan.id, name: plan.name, hotmartId: plan.hotmartId, issue: `Esperado: ${expectedHotmartId}, Atual: ${plan.hotmartId}` })
        console.log(`❌ Plano com hotmartId incorreto: ${plan.name}`)
        console.log(`   Atual: ${plan.hotmartId}, Esperado: ${expectedHotmartId}`)
      } else if (plan.currency?.toUpperCase() !== expectedData.currency.toUpperCase()) {
        plansWithWrongId.push({ id: plan.id, name: plan.name, hotmartId: plan.hotmartId, issue: `Moeda incorreta: ${plan.currency} (esperado: ${expectedData.currency})` })
        console.log(`❌ Plano com moeda incorreta: ${plan.name}`)
        console.log(`   Atual: ${plan.currency}, Esperado: ${expectedData.currency}`)
      } else {
        console.log(`✅ Plano correto: ${plan.name} (hotmartId: ${plan.hotmartId})`)
      }
    }
    
    // 2. Corrigir planos sem hotmartId ou com hotmartId incorreto
    if (plansWithoutId.length > 0 || plansWithWrongId.length > 0) {
      console.log('\n🔄 Corrigindo planos...\n')
      
      for (const plan of [...plansWithoutId, ...plansWithWrongId]) {
        // Verificar se é do tipo plansWithoutId (tem offerKey) ou plansWithWrongId (tem hotmartId)
        const offerKey = 'offerKey' in plan ? plan.offerKey : null
        if (!offerKey) {
          // Se não tem offerKey, buscar pelo hotmartId
          if ('hotmartId' in plan && plan.hotmartId) {
            const expectedPlan = Object.entries(correctPlans).find(([id]) => parseInt(id) === plan.hotmartId)
            if (!expectedPlan) continue
            const expectedHotmartId = parseInt(expectedPlan[0])
            const expectedData = expectedPlan[1]
            try {
              await prisma.plan.update({
                where: { id: plan.id },
                data: {
                  hotmartId: expectedHotmartId,
                  currency: expectedData.currency,
                  interval: expectedData.interval as 'MONTH' | 'YEAR'
                }
              })
              console.log(`✅ Plano corrigido: ${plan.name} -> hotmartId ${expectedHotmartId}`)
            } catch (error) {
              console.error(`❌ Erro ao corrigir plano ${plan.name}:`, error)
            }
          }
          continue
        }
        
        const expectedPlan = Object.entries(correctPlans).find(([_, data]) => data.offerKey === offerKey)
        
        if (!expectedPlan) continue
        
        const expectedHotmartId = parseInt(expectedPlan[0])
        const expectedData = expectedPlan[1]
        
        try {
          await prisma.plan.update({
            where: { id: plan.id },
            data: {
              hotmartId: expectedHotmartId,
              currency: expectedData.currency,
              interval: expectedData.interval as 'MONTH' | 'YEAR'
            }
          })
          console.log(`✅ Plano corrigido: ${plan.name} -> hotmartId ${expectedHotmartId}`)
        } catch (error) {
          console.error(`❌ Erro ao corrigir plano ${plan.name}:`, error)
        }
      }
    }
    
    // 3. Verificar e corrigir assinaturas
    console.log('\n📋 Verificando assinaturas...\n')
    const subscriptions = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: { startsWith: 'hotmart_' }
      },
      include: {
        plan: true,
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Total de assinaturas: ${subscriptions.length}\n`)
    
    let fixedSubscriptions = 0
    const issues: Array<{ email: string; currentPlan: string; issue: string }> = []
    
    for (const sub of subscriptions) {
      const plan = sub.plan
      
      if (!plan.hotmartId) {
        // Tentar encontrar plano correto pelo offerKey
        const offerKey = plan.hotmartOfferKey || plan.stripePriceId
        const expectedPlan = Object.entries(correctPlans).find(([_, data]) => data.offerKey === offerKey)
        
        if (expectedPlan) {
          const expectedHotmartId = parseInt(expectedPlan[0])
          const expectedData = expectedPlan[1]
          
          // Buscar plano correto
          const correctPlan = await prisma.plan.findFirst({
            where: {
              hotmartId: expectedHotmartId,
              currency: expectedData.currency,
              interval: expectedData.interval as 'MONTH' | 'YEAR'
            }
          })
          
          if (correctPlan && correctPlan.id !== plan.id) {
            try {
              await prisma.subscription.update({
                where: { id: sub.id },
                data: { planId: correctPlan.id }
              })
              console.log(`✅ Assinatura corrigida: ${sub.user.email} -> ${correctPlan.name}`)
              fixedSubscriptions++
            } catch (error) {
              console.error(`❌ Erro ao corrigir assinatura:`, error)
              issues.push({ email: sub.user.email, currentPlan: plan.name, issue: `Erro ao atualizar` })
            }
          }
        } else {
          issues.push({ email: sub.user.email, currentPlan: plan.name, issue: 'Plano não encontrado no mapeamento' })
        }
      } else {
        // Verificar se o plano está correto
        const expectedData = correctPlans[plan.hotmartId]
        
        if (expectedData) {
          const needsFix = 
            plan.currency?.toUpperCase() !== expectedData.currency.toUpperCase() ||
            plan.interval !== expectedData.interval
          
          if (needsFix) {
            // Buscar plano correto
            const correctPlan = await prisma.plan.findFirst({
              where: {
                hotmartId: plan.hotmartId,
                currency: expectedData.currency,
                interval: expectedData.interval as 'MONTH' | 'YEAR'
              }
            })
            
            if (correctPlan && correctPlan.id !== plan.id) {
              try {
                await prisma.subscription.update({
                  where: { id: sub.id },
                  data: { planId: correctPlan.id }
                })
                console.log(`✅ Assinatura corrigida: ${sub.user.email} -> ${correctPlan.name}`)
                fixedSubscriptions++
              } catch (error) {
                console.error(`❌ Erro ao corrigir assinatura:`, error)
                issues.push({ email: sub.user.email, currentPlan: plan.name, issue: `Erro ao atualizar` })
              }
            }
          }
        }
      }
    }
    
    console.log('\n\n📊 RESUMO:')
    console.log(`   Planos sem hotmartId: ${plansWithoutId.length}`)
    console.log(`   Planos com hotmartId incorreto: ${plansWithWrongId.length}`)
    console.log(`   Assinaturas corrigidas: ${fixedSubscriptions}`)
    console.log(`   Problemas não resolvidos: ${issues.length}`)
    
    if (issues.length > 0) {
      console.log('\n⚠️ PROBLEMAS NÃO RESOLVIDOS:')
      issues.forEach(issue => {
        console.log(`   - ${issue.email}: ${issue.issue}`)
      })
    }
    
    console.log('\n✅ Verificação concluída!')
    
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


