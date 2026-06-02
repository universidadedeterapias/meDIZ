// src/scripts/calculate-monthly-revenue.ts
import { prisma } from '@/lib/prisma'
import { PlanInterval } from '@prisma/client'

async function calculateMonthlyRevenue() {
  console.log('💰 CÁLCULO DO VALOR TOTAL DAS ASSINATURAS MENSAIS\n')
  console.log('=' .repeat(60))

  try {
    const now = new Date()

    // Buscar todas as assinaturas ativas com planos mensais
    const monthlySubscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: now
        },
        plan: {
          interval: PlanInterval.MONTH
        }
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            interval: true
          }
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    })

    console.log(`\n📊 Total de assinaturas mensais ativas: ${monthlySubscriptions.length}`)

    if (monthlySubscriptions.length === 0) {
      console.log('\n⚠️  Nenhuma assinatura mensal ativa encontrada.')
      return
    }

    // Agrupar por moeda e calcular totais
    const revenueByCurrency: Record<string, { total: number; count: number; subscriptions: typeof monthlySubscriptions }> = {}
    const revenueByPlan: Record<string, { total: number; count: number; currency: string }> = {}

    monthlySubscriptions.forEach(sub => {
      const plan = sub.plan
      const amount = plan.amount || 0
      const currency = plan.currency || 'BRL'

      // Agrupar por moeda
      if (!revenueByCurrency[currency]) {
        revenueByCurrency[currency] = {
          total: 0,
          count: 0,
          subscriptions: []
        }
      }
      revenueByCurrency[currency].total += amount
      revenueByCurrency[currency].count += 1
      revenueByCurrency[currency].subscriptions.push(sub)

      // Agrupar por plano
      const planKey = `${plan.name} (${currency})`
      if (!revenueByPlan[planKey]) {
        revenueByPlan[planKey] = {
          total: 0,
          count: 0,
          currency: currency
        }
      }
      revenueByPlan[planKey].total += amount
      revenueByPlan[planKey].count += 1
    })

    // Mostrar resumo por moeda
    console.log(`\n💰 VALOR TOTAL POR MOEDA:`)
    Object.entries(revenueByCurrency)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([currency, data]) => {
        const totalInMainUnit = data.total / 100 // Converter centavos para unidade principal
        const formattedTotal = currency === 'USD' 
          ? `$${totalInMainUnit.toFixed(2)}`
          : `R$ ${totalInMainUnit.toFixed(2)}`
        
        console.log(`\n   ${currency}:`)
        console.log(`      Total: ${formattedTotal} (${data.total} centavos)`)
        console.log(`      Quantidade: ${data.count} assinaturas`)
        console.log(`      Valor médio: ${currency === 'USD' ? '$' : 'R$'} ${(totalInMainUnit / data.count).toFixed(2)} por assinatura`)
      })

    // Mostrar detalhamento por plano
    console.log(`\n📋 DETALHAMENTO POR PLANO:`)
    Object.entries(revenueByPlan)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([planName, data]) => {
        const totalInMainUnit = data.total / 100
        const currency = data.currency
        const formattedTotal = currency === 'USD' 
          ? `$${totalInMainUnit.toFixed(2)}`
          : `R$ ${totalInMainUnit.toFixed(2)}`
        
        console.log(`\n   ${planName}:`)
        console.log(`      Quantidade: ${data.count} assinaturas`)
        console.log(`      Valor unitário: ${currency === 'USD' ? '$' : 'R$'} ${(totalInMainUnit / data.count).toFixed(2)}`)
        console.log(`      Total: ${formattedTotal}`)
      })

    // Calcular total geral (convertendo USD para BRL se necessário)
    const totalBRL = revenueByCurrency['BRL']?.total || 0
    const totalUSD = revenueByCurrency['USD']?.total || 0
    
    // Taxa de conversão aproximada (você pode ajustar isso)
    const USD_TO_BRL_RATE = 5.0 // Exemplo: 1 USD = 5 BRL
    const totalUSDBRL = totalUSD * USD_TO_BRL_RATE
    const totalGeralBRL = totalBRL + totalUSDBRL

    console.log(`\n\n💵 RESUMO FINAL:`)
    console.log(`   Total em BRL: R$ ${(totalBRL / 100).toFixed(2)}`)
    if (totalUSD > 0) {
      console.log(`   Total em USD: $${(totalUSD / 100).toFixed(2)}`)
      console.log(`   Total em USD convertido para BRL (taxa ${USD_TO_BRL_RATE}): R$ ${(totalUSDBRL / 100).toFixed(2)}`)
    }
    console.log(`   💰 TOTAL GERAL (BRL): R$ ${(totalGeralBRL / 100).toFixed(2)}`)
    console.log(`\n   📊 Total de assinaturas mensais: ${monthlySubscriptions.length}`)

    // Listar assinaturas sem valor definido (para verificação)
    const subscriptionsWithoutAmount = monthlySubscriptions.filter(sub => !sub.plan.amount || sub.plan.amount === 0)
    if (subscriptionsWithoutAmount.length > 0) {
      console.log(`\n⚠️  ATENÇÃO: ${subscriptionsWithoutAmount.length} assinaturas sem valor definido:`)
      subscriptionsWithoutAmount.forEach(sub => {
        console.log(`   - ${sub.user.email}: ${sub.plan.name} (Plano ID: ${sub.plan.id})`)
      })
    }

  } catch (error) {
    console.error('❌ Erro no cálculo:', error)
  } finally {
    await prisma.$disconnect()
  }
}

calculateMonthlyRevenue()
