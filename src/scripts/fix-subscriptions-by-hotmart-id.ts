// src/scripts/fix-subscriptions-by-hotmart-id.ts
// Corrige assinaturas baseado no hotmartId do plano (fonte única de verdade)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapeamento correto: hotmartId -> moeda esperada
const correctPlansByHotmartId: Record<number, { currency: string; interval: string }> = {
  // BRL - Mensais
  1115304: { currency: 'BRL', interval: 'MONTH' },
  1115305: { currency: 'BRL', interval: 'MONTH' },
  1163392: { currency: 'BRL', interval: 'MONTH' },
  // BRL - Anuais
  1115306: { currency: 'BRL', interval: 'YEAR' },
  1115307: { currency: 'BRL', interval: 'YEAR' },
  // USD - Mensais
  1197626: { currency: 'USD', interval: 'MONTH' },
  // USD - Anuais
  1197627: { currency: 'USD', interval: 'YEAR' }
}

async function main() {
  try {
    console.log('🔍 Buscando assinaturas Hotmart para correção baseada em hotmartId...\n')
    
    // Buscar todas as assinaturas Hotmart (sem incluir hotmartId se campo não existir)
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
            interval: true,
            hotmartId: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total de assinaturas Hotmart: ${hotmartSubscriptions.length}\n`)
    
    if (hotmartSubscriptions.length === 0) {
      console.log('✅ Nenhuma assinatura Hotmart encontrada.')
      return
    }
    
    let fixed = 0
    let needsFix = 0
    const issues: Array<{
      email: string
      currentPlan: string
      hotmartId: number | null
      issue: string
    }> = []
    
    for (const subscription of hotmartSubscriptions) {
      const plan = subscription.plan
      const user = subscription.user
      
      // Se o plano não tem hotmartId, não podemos corrigir
      if (!plan.hotmartId) {
        console.log(`\n⚠️ Assinatura ${subscription.id} (${user.email})`)
        console.log(`   Plano atual: ${plan.name}`)
        console.log(`   ⚠️ Plano não tem hotmartId definido - não é possível corrigir automaticamente`)
        issues.push({
          email: user.email,
          currentPlan: plan.name,
          hotmartId: null,
          issue: 'Plano não tem hotmartId definido'
        })
        continue
      }
      
      // Verificar se o hotmartId está no mapeamento correto
      const expectedPlan = correctPlansByHotmartId[plan.hotmartId]
      
      if (!expectedPlan) {
        console.log(`\n⚠️ Assinatura ${subscription.id} (${user.email})`)
        console.log(`   Plano atual: ${plan.name}`)
        console.log(`   hotmartId: ${plan.hotmartId}`)
        console.log(`   ⚠️ hotmartId não está no mapeamento de planos corretos`)
        issues.push({
          email: user.email,
          currentPlan: plan.name,
          hotmartId: plan.hotmartId,
          issue: `hotmartId ${plan.hotmartId} não está no mapeamento`
        })
        continue
      }
      
      // Verificar se precisa correção
      const needsCurrencyFix = plan.currency?.toUpperCase() !== expectedPlan.currency.toUpperCase()
      const needsIntervalFix = plan.interval !== expectedPlan.interval
      
      if (!needsCurrencyFix && !needsIntervalFix) {
        // Plano está correto
        continue
      }
      
      needsFix++
      console.log(`\n📋 Assinatura: ${subscription.id}`)
      console.log(`   Usuário: ${user.email}`)
      console.log(`   Plano atual: ${plan.name}`)
      console.log(`   hotmartId: ${plan.hotmartId}`)
      console.log(`   Moeda atual: ${plan.currency || 'NÃO DEFINIDA'} (esperada: ${expectedPlan.currency})`)
      console.log(`   Intervalo atual: ${plan.interval || 'NÃO DEFINIDO'} (esperado: ${expectedPlan.interval})`)
      
      if (needsCurrencyFix) {
        console.log(`   🚨 PROBLEMA: Moeda incorreta!`)
      }
      if (needsIntervalFix) {
        console.log(`   🚨 PROBLEMA: Intervalo incorreto!`)
      }
      
      // Buscar o plano correto no banco
      const correctPlan = await prisma.plan.findFirst({
        where: {
          hotmartId: plan.hotmartId,
          currency: expectedPlan.currency,
          interval: expectedPlan.interval as 'MONTH' | 'YEAR'
        }
      })
      
      if (!correctPlan) {
        console.log(`   ❌ Plano correto não encontrado no banco!`)
        console.log(`   💡 Execute: npm run sync-hotmart-plans`)
        issues.push({
          email: user.email,
          currentPlan: plan.name,
          hotmartId: plan.hotmartId,
          issue: `Plano correto não encontrado (esperado: hotmartId ${plan.hotmartId}, currency ${expectedPlan.currency}, interval ${expectedPlan.interval})`
        })
        continue
      }
      
      // Se o plano correto é diferente do atual, atualizar
      if (correctPlan.id !== plan.id) {
        console.log(`   ✅ Plano correto encontrado: ${correctPlan.name} (${correctPlan.currency})`)
        
        try {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { planId: correctPlan.id }
          })
          
          console.log(`   ✅ Assinatura corrigida!`)
          fixed++
        } catch (error) {
          console.error(`   ❌ Erro ao corrigir:`, error)
          issues.push({
            email: user.email,
            currentPlan: plan.name,
            hotmartId: plan.hotmartId,
            issue: `Erro ao atualizar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          })
        }
      } else {
        console.log(`   ✅ Plano já está correto (mesmo ID)`)
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
        console.log(`   - ${issue.email}: ${issue.issue}`)
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

