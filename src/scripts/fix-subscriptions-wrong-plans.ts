// src/scripts/fix-subscriptions-wrong-plans.ts
// Corrige assinaturas que estão associadas a planos com moeda incorreta
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapeamento correto dos planos Hotmart
const correctPlans = {
  // BRL - Mensais
  1115304: { hotmartId: 1115304, offerKey: '9dv1fqir', currency: 'BRL', interval: 'MONTH' },
  1115305: { hotmartId: 1115305, offerKey: '5zwrxs0n', currency: 'BRL', interval: 'MONTH' },
  1163392: { hotmartId: 1163392, offerKey: 'b24v0i4q', currency: 'BRL', interval: 'MONTH' },
  // BRL - Anuais
  1115306: { hotmartId: 1115306, offerKey: 'jcuheq2m', currency: 'BRL', interval: 'YEAR' },
  1115307: { hotmartId: 1115307, offerKey: '2icona9m', currency: 'BRL', interval: 'YEAR' },
  // USD - Mensais
  1197626: { hotmartId: 1197626, offerKey: 'qhs594oc', currency: 'USD', interval: 'MONTH' },
  // USD - Anuais
  1197627: { hotmartId: 1197627, offerKey: 'i7m8kqyw', currency: 'USD', interval: 'YEAR' }
}

// Mapeamento por offerKey também
const correctPlansByOfferKey: Record<string, { hotmartId: number; offerKey: string; currency: string; interval: string }> = {}
Object.values(correctPlans).forEach(plan => {
  correctPlansByOfferKey[plan.offerKey] = plan
})

async function main() {
  try {
    console.log('🔍 Buscando assinaturas Hotmart para correção...\n')
    
    // Buscar todas as assinaturas Hotmart
    const hotmartSubscriptions = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: {
          startsWith: 'hotmart_'
        }
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            stripePriceId: true,
            hotmartOfferKey: true,
            currency: true,
            interval: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total de assinaturas Hotmart encontradas: ${hotmartSubscriptions.length}\n`)
    
    if (hotmartSubscriptions.length === 0) {
      console.log('✅ Nenhuma assinatura Hotmart encontrada.')
      return
    }
    
    let fixed = 0
    let needsFix = 0
    const issues: Array<{
      subscriptionId: string
      userEmail: string
      currentPlan: string
      currentCurrency: string
      issue: string
    }> = []
    
    for (const subscription of hotmartSubscriptions) {
      const plan = subscription.plan
      const user = subscription.user
      
      console.log(`\n📋 Assinatura: ${subscription.id}`)
      console.log(`   Usuário: ${user.email}`)
      console.log(`   Plano atual: ${plan.name}`)
      console.log(`   Moeda atual: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`   Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`   offerKey: ${plan.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      
      // Tentar identificar o plano correto
      let correctPlanData: { hotmartId: number; offerKey: string; currency: string; interval: string } | null = null
      
      // Primeiro tentar por offerKey (mais confiável se hotmartId não existe)
      if (plan.hotmartOfferKey && correctPlansByOfferKey[plan.hotmartOfferKey]) {
        correctPlanData = correctPlansByOfferKey[plan.hotmartOfferKey]
        console.log(`   ✅ Plano correto identificado por offerKey: ${correctPlanData.offerKey}`)
      } else if (plan.stripePriceId && correctPlansByOfferKey[plan.stripePriceId]) {
        correctPlanData = correctPlansByOfferKey[plan.stripePriceId]
        console.log(`   ✅ Plano correto identificado por stripePriceId: ${plan.stripePriceId}`)
      }
      
      // Se ainda não encontrou, tentar identificar pelo nome do plano
      if (!correctPlanData) {
        // Tentar identificar pelo nome (fallback)
        const planNameLower = plan.name.toLowerCase()
        if (planNameLower.includes('dólar') || planNameLower.includes('dolar')) {
          // É um plano em dólar - verificar se deveria ser BRL
          if (plan.interval === 'MONTH') {
            correctPlanData = correctPlans[1197626] // Plano Mensal - Dólar
          } else if (plan.interval === 'YEAR') {
            correctPlanData = correctPlans[1197627] // Plano Anual - Dólar
          }
        } else if (planNameLower.includes('mensal') && !planNameLower.includes('dólar') && !planNameLower.includes('dolar')) {
          // É um plano mensal BRL
          correctPlanData = correctPlans[1115304] // Plano Profissional | Mensal
        } else if (planNameLower.includes('anual') && !planNameLower.includes('dólar') && !planNameLower.includes('dolar')) {
          // É um plano anual BRL
          correctPlanData = correctPlans[1115306] // PLANO PROFISSIONAL - ANUAL
        }
      }
      
      if (!correctPlanData) {
        console.log(`   ⚠️ Não foi possível identificar o plano correto`)
        issues.push({
          subscriptionId: subscription.id,
          userEmail: user.email,
          currentPlan: plan.name,
          currentCurrency: plan.currency || 'NÃO DEFINIDA',
          issue: 'Não foi possível identificar plano correto'
        })
        continue
      }
      
      // Verificar se precisa corrigir
      const needsCurrencyFix = plan.currency?.toUpperCase() !== correctPlanData.currency.toUpperCase()
      const needsIntervalFix = plan.interval !== correctPlanData.interval
      
      if (!needsCurrencyFix && !needsIntervalFix) {
        console.log(`   ✅ Plano está correto`)
        continue
      }
      
      needsFix++
      console.log(`   🚨 PROBLEMA DETECTADO:`)
      if (needsCurrencyFix) {
        console.log(`      - Moeda incorreta: ${plan.currency} (deveria ser ${correctPlanData.currency})`)
      }
      if (needsIntervalFix) {
        console.log(`      - Intervalo incorreto: ${plan.interval} (deveria ser ${correctPlanData.interval})`)
      }
      
      // Buscar o plano correto no banco
      const correctPlan = await prisma.plan.findFirst({
        where: {
          OR: [
            { hotmartOfferKey: correctPlanData.offerKey },
            { stripePriceId: correctPlanData.offerKey }
          ],
          currency: correctPlanData.currency,
          interval: correctPlanData.interval as 'MONTH' | 'YEAR'
        }
      })
      
      if (!correctPlan) {
        console.log(`   ❌ Plano correto não encontrado no banco!`)
        console.log(`   💡 Execute: npm run sync-hotmart-plans`)
        issues.push({
          subscriptionId: subscription.id,
          userEmail: user.email,
          currentPlan: plan.name,
          currentCurrency: plan.currency || 'NÃO DEFINIDA',
          issue: `Plano correto não encontrado no banco (hotmartId: ${correctPlanData.hotmartId}, currency: ${correctPlanData.currency})`
        })
        continue
      }
      
      console.log(`   ✅ Plano correto encontrado: ${correctPlan.name} (${correctPlan.currency})`)
      
      // Atualizar a assinatura
      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { planId: correctPlan.id }
        })
        
        console.log(`   ✅ Assinatura corrigida!`)
        fixed++
      } catch (error) {
        console.error(`   ❌ Erro ao corrigir assinatura:`, error)
        issues.push({
          subscriptionId: subscription.id,
          userEmail: user.email,
          currentPlan: plan.name,
          currentCurrency: plan.currency || 'NÃO DEFINIDA',
          issue: `Erro ao atualizar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        })
      }
    }
    
    console.log('\n\n📊 RESUMO:')
    console.log(`   Total de assinaturas verificadas: ${hotmartSubscriptions.length}`)
    console.log(`   Assinaturas que precisavam correção: ${needsFix}`)
    console.log(`   Assinaturas corrigidas: ${fixed}`)
    console.log(`   Problemas não resolvidos: ${issues.length}`)
    
    if (issues.length > 0) {
      console.log('\n⚠️ PROBLEMAS NÃO RESOLVIDOS:')
      issues.forEach(issue => {
        console.log(`   - ${issue.userEmail}: ${issue.issue}`)
      })
    }
    
    if (fixed > 0) {
      console.log(`\n✅ ${fixed} assinatura(s) corrigida(s) com sucesso!`)
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

