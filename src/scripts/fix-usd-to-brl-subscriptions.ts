// src/scripts/fix-usd-to-brl-subscriptions.ts
// Corrige assinaturas que estão com plano USD mas deveriam ser BRL
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Planos BRL corretos
const brlPlans = {
  MONTH: {
    offerKey: '9dv1fqir',
    name: 'Plano Profissional | Mensal',
    hotmartId: 1115304
  },
  YEAR: {
    offerKey: 'jcuheq2m',
    name: 'PLANO PROFISSIONAL - ANUAL',
    hotmartId: 1115306
  }
}

async function main() {
  try {
    console.log('🔍 Buscando assinaturas Hotmart com planos USD que deveriam ser BRL...\n')
    
    // Buscar assinaturas Hotmart com planos USD
    const usdSubscriptions = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: {
          startsWith: 'hotmart_'
        },
        plan: {
          currency: 'USD'
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
    
    console.log(`📊 Total de assinaturas com planos USD: ${usdSubscriptions.length}\n`)
    
    if (usdSubscriptions.length === 0) {
      console.log('✅ Nenhuma assinatura com plano USD encontrada.')
      return
    }
    
    let fixed = 0
    let needsManualReview = 0
    const issues: Array<{
      email: string
      currentPlan: string
      offerKey: string
      reason: string
    }> = []
    
    for (const subscription of usdSubscriptions) {
      const plan = subscription.plan
      const user = subscription.user
      
      console.log(`\n📋 Assinatura: ${subscription.id}`)
      console.log(`   Usuário: ${user.email}`)
      console.log(`   Plano atual: ${plan.name} (${plan.currency})`)
      console.log(`   OfferKey: ${plan.hotmartOfferKey || plan.stripePriceId}`)
      console.log(`   Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      
      // Estratégia: Se o offerKey não corresponde a um plano USD conhecido, provavelmente deveria ser BRL
      const knownUsdOfferKeys = ['qhs594oc', 'i7m8kqyw'] // Planos USD conhecidos
      const currentOfferKey = plan.hotmartOfferKey || plan.stripePriceId
      
      const isKnownUsdPlan = knownUsdOfferKeys.includes(currentOfferKey)
      
      if (!isKnownUsdPlan) {
        console.log(`   🚨 PROBLEMA: OfferKey "${currentOfferKey}" não é um plano USD conhecido!`)
        console.log(`   💡 Provavelmente deveria ser BRL`)
        
        // Tentar encontrar plano BRL correto baseado no intervalo
        const targetInterval = plan.interval === 'YEAR' ? 'YEAR' : 'MONTH'
        const correctBRLPlan = brlPlans[targetInterval]
        
        if (!correctBRLPlan) {
          console.log(`   ⚠️ Não foi possível determinar plano BRL correto`)
          needsManualReview++
          issues.push({
            email: user.email,
            currentPlan: plan.name,
            offerKey: currentOfferKey,
            reason: 'Não foi possível determinar plano BRL correto'
          })
          continue
        }
        
        // Buscar o plano BRL correto no banco
        const brlPlan = await prisma.plan.findFirst({
          where: {
            OR: [
              { hotmartOfferKey: correctBRLPlan.offerKey },
              { stripePriceId: correctBRLPlan.offerKey }
            ],
            currency: 'BRL',
            interval: targetInterval
          }
        })
        
        if (!brlPlan) {
          console.log(`   ❌ Plano BRL correto não encontrado no banco!`)
          console.log(`   💡 Execute: npm run sync-hotmart-plans`)
          needsManualReview++
          issues.push({
            email: user.email,
            currentPlan: plan.name,
            offerKey: currentOfferKey,
            reason: `Plano BRL correto não encontrado (esperado: ${correctBRLPlan.offerKey})`
          })
          continue
        }
        
        console.log(`   ✅ Plano BRL correto encontrado: ${brlPlan.name}`)
        
        // Atualizar assinatura
        try {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { planId: brlPlan.id }
          })
          
          console.log(`   ✅ Assinatura corrigida!`)
          fixed++
        } catch (error) {
          console.error(`   ❌ Erro ao corrigir:`, error)
          needsManualReview++
          issues.push({
            email: user.email,
            currentPlan: plan.name,
            offerKey: currentOfferKey,
            reason: `Erro ao atualizar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          })
        }
      } else {
        console.log(`   ✅ Plano USD é válido (offerKey conhecido)`)
        // Mas ainda pode estar errado se o usuário é brasileiro
        // Vou marcar para revisão manual se necessário
      }
    }
    
    console.log('\n\n📊 RESUMO:')
    console.log(`   Total de assinaturas USD verificadas: ${usdSubscriptions.length}`)
    console.log(`   Assinaturas corrigidas: ${fixed}`)
    console.log(`   Precisa revisão manual: ${needsManualReview}`)
    
    if (issues.length > 0) {
      console.log('\n⚠️ ASSINATURAS QUE PRECISAM REVISÃO MANUAL:')
      issues.forEach(issue => {
        console.log(`   - ${issue.email}: ${issue.reason}`)
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

