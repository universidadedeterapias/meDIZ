// src/scripts/sync-hotmart-plans.ts
// Script para sincronizar planos Hotmart no banco de dados
import { PrismaClient, PlanInterval } from '@prisma/client'

const prisma = new PrismaClient()

// Definição dos planos baseada nos IDs fornecidos
const hotmartPlans = [
  // Planos BRL - Mensais
  {
    hotmartId: 1115304,
    name: 'Plano Profissional | Mensal',
    description: 'Assinatura Mensal',
    stripePriceId: 'price_hotmart_mensal',
    hotmartOfferKey: '9dv1fqir',
    amount: 3990, // R$ 39.90 em centavos
    currency: 'BRL',
    interval: PlanInterval.MONTH,
    intervalCount: 1,
    frequencyRecurrenceDays: 30,
    trialPeriodDays: null,
    active: true
  },
  {
    hotmartId: 1115305,
    name: 'PLANO PROFISSIONAL - MENSAL c/ 30D Experiência',
    description: 'Assinatura Mensal c/ 30D Gratuito',
    stripePriceId: 'price_hotmart_mensal_trial',
    hotmartOfferKey: '5zwrxs0n',
    amount: 3990, // R$ 39.90 em centavos
    currency: 'BRL',
    interval: PlanInterval.MONTH,
    intervalCount: 1,
    frequencyRecurrenceDays: 30,
    trialPeriodDays: 30,
    active: true
  },
  {
    hotmartId: 1163392,
    name: 'Plano 1 Real',
    description: 'Campanha de Captação',
    stripePriceId: 'price_hotmart_mensal_campaign',
    hotmartOfferKey: 'b24v0i4q',
    amount: 3990, // R$ 39.90 em centavos
    currency: 'BRL',
    interval: PlanInterval.MONTH,
    intervalCount: 1,
    frequencyRecurrenceDays: 30,
    trialPeriodDays: 30,
    active: true
  },
  // Planos BRL - Anuais
  {
    hotmartId: 1115306,
    name: 'PLANO PROFISSIONAL - ANUAL',
    description: 'Assinatura Anual c/ 25% DESCONTO',
    stripePriceId: 'price_hotmart_anual',
    hotmartOfferKey: 'jcuheq2m',
    amount: 35880, // R$ 358.80 em centavos
    currency: 'BRL',
    interval: PlanInterval.YEAR,
    intervalCount: 1,
    frequencyRecurrenceDays: 360,
    trialPeriodDays: null,
    active: true
  },
  {
    hotmartId: 1115307,
    name: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS',
    description: 'Assinatura Anual c/ 30D Gratuitos',
    stripePriceId: 'price_hotmart_anual_trial',
    hotmartOfferKey: '2icona9m',
    amount: 35880, // R$ 358.80 em centavos
    currency: 'BRL',
    interval: PlanInterval.YEAR,
    intervalCount: 1,
    frequencyRecurrenceDays: 360,
    trialPeriodDays: 30,
    active: true
  },
  // Planos USD - Mensais
  {
    hotmartId: 1197626,
    name: 'Plano Mensal - Dólar',
    description: 'Cancela cuando quieras',
    stripePriceId: 'price_hotmart_mensal_usd',
    hotmartOfferKey: 'qhs594oc',
    amount: 990, // $ 9.90 em centavos
    currency: 'USD',
    interval: PlanInterval.MONTH,
    intervalCount: 1,
    frequencyRecurrenceDays: 30,
    trialPeriodDays: null,
    active: true
  },
  // Planos USD - Anuais
  {
    hotmartId: 1197627,
    name: 'Plano Anual - Dólar',
    description: 'Mejor economía',
    stripePriceId: 'price_hotmart_anual_usd',
    hotmartOfferKey: 'i7m8kqyw',
    amount: 9700, // $ 97.00 em centavos
    currency: 'USD',
    interval: PlanInterval.YEAR,
    intervalCount: 1,
    frequencyRecurrenceDays: 360,
    trialPeriodDays: null,
    active: true
  }
]

async function syncPlans() {
  try {
    console.log('🔄 Iniciando sincronização de planos Hotmart...\n')

    // Verificar planos existentes
    const existingPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { stripePriceId: { contains: 'hotmart' } },
          { hotmartOfferKey: { not: null } }
        ]
      }
    })

    console.log(`📊 Encontrados ${existingPlans.length} planos Hotmart existentes\n`)

    let created = 0
    let updated = 0
    let skipped = 0

    for (const planData of hotmartPlans) {
      // Verificar se já existe pelo stripePriceId ou hotmartOfferKey
      const existingByPriceId = await prisma.plan.findUnique({
        where: { stripePriceId: planData.stripePriceId }
      })

      const existingByOfferKey = planData.hotmartOfferKey
        ? await prisma.plan.findUnique({
            where: { hotmartOfferKey: planData.hotmartOfferKey }
          })
        : null

      if (existingByPriceId) {
        // Atualizar plano existente
        await prisma.plan.update({
          where: { id: existingByPriceId.id },
          data: {
            name: planData.name,
            hotmartOfferKey: planData.hotmartOfferKey,
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`✅ Atualizado: ${planData.name} (${planData.stripePriceId})`)
        if (planData.hotmartOfferKey) {
          console.log(`   OfferKey: ${planData.hotmartOfferKey}`)
        }
        if (planData.trialPeriodDays) {
          console.log(`   Trial: ${planData.trialPeriodDays} dias`)
        }
        updated++
      } else if (existingByOfferKey && existingByOfferKey.stripePriceId !== planData.stripePriceId) {
        // Se existe pelo offerKey mas com stripePriceId diferente, atualizar
        await prisma.plan.update({
          where: { id: existingByOfferKey.id },
          data: {
            stripePriceId: planData.stripePriceId,
            name: planData.name,
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`✅ Atualizado (por offerKey): ${planData.name} (${planData.stripePriceId})`)
        updated++
      } else {
        // Criar novo plano
        await prisma.plan.create({
          data: {
            name: planData.name,
            stripePriceId: planData.stripePriceId,
            hotmartOfferKey: planData.hotmartOfferKey,
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`➕ Criado: ${planData.name} (${planData.stripePriceId})`)
        if (planData.hotmartOfferKey) {
          console.log(`   OfferKey: ${planData.hotmartOfferKey}`)
        }
        if (planData.trialPeriodDays) {
          console.log(`   Trial: ${planData.trialPeriodDays} dias`)
        }
        created++
      }
    }

    console.log('\n📈 Resumo:')
    console.log(`   ✅ Criados: ${created}`)
    console.log(`   🔄 Atualizados: ${updated}`)
    console.log(`   ⏭️  Ignorados: ${skipped}`)
    console.log('\n🎉 Sincronização concluída com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao sincronizar planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  syncPlans()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { syncPlans }

