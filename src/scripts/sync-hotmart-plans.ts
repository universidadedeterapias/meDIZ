// src/scripts/sync-hotmart-plans.ts
// Script para sincronizar planos Hotmart no banco de dados
import { PrismaClient, PlanInterval } from '@prisma/client'

const prisma = new PrismaClient()

// Definição dos planos baseada nos dados fornecidos pela Hotmart API
// Dados atualizados em: 2025-01-XX
const hotmartPlans = [
  // Planos BRL - Mensais
  {
    hotmartId: 1115304,
    name: 'Plano Profissional | Mensal',
    description: 'Assinatura Mensal',
    stripePriceId: '9dv1fqir', // Usando offerKey como stripePriceId para facilitar busca
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
    stripePriceId: '5zwrxs0n',
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
    stripePriceId: 'b24v0i4q',
    hotmartOfferKey: 'b24v0i4q',
    amount: 3990, // R$ 39.90 em centavos
    currency: 'BRL',
    interval: PlanInterval.MONTH,
    intervalCount: 1,
    frequencyRecurrenceDays: 30,
    trialPeriodDays: 30,
    active: true
  },
  // Planos BRL - Anuais (CRÍTICO: interval = YEAR)
  {
    hotmartId: 1115306,
    name: 'PLANO PROFISSIONAL - ANUAL',
    description: 'Assinatura Anual c/ 25% DESCONTO',
    stripePriceId: 'jcuheq2m',
    hotmartOfferKey: 'jcuheq2m',
    amount: 35880, // R$ 358.80 em centavos
    currency: 'BRL',
    interval: PlanInterval.YEAR, // ⚠️ CRÍTICO: Deve ser YEAR, não MONTH
    intervalCount: 1,
    frequencyRecurrenceDays: 360,
    trialPeriodDays: null,
    active: true
  },
  {
    hotmartId: 1115307,
    name: 'PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS',
    description: 'Assinatura Anual c/ 30D Gratuitos',
    stripePriceId: '2icona9m',
    hotmartOfferKey: '2icona9m',
    amount: 35880, // R$ 358.80 em centavos
    currency: 'BRL',
    interval: PlanInterval.YEAR, // ⚠️ CRÍTICO: Deve ser YEAR, não MONTH
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
    stripePriceId: 'qhs594oc',
    hotmartOfferKey: 'qhs594oc',
    amount: 990, // $ 9.90 em centavos
    currency: 'USD',
    interval: PlanInterval.MONTH,
    intervalCount: 1,
    frequencyRecurrenceDays: 30,
    trialPeriodDays: null,
    active: true
  },
  // Planos USD - Anuais (CRÍTICO: interval = YEAR)
  {
    hotmartId: 1197627,
    name: 'Plano Anual - Dólar',
    description: 'Mejor economía',
    stripePriceId: 'i7m8kqyw',
    hotmartOfferKey: 'i7m8kqyw',
    amount: 9700, // $ 97.00 em centavos
    currency: 'USD',
    interval: PlanInterval.YEAR, // ⚠️ CRÍTICO: Deve ser YEAR, não MONTH
    intervalCount: 1,
    frequencyRecurrenceDays: 360,
    trialPeriodDays: null,
    active: true
  }
]

async function syncPlans() {
  try {
    console.log('🔄 Iniciando sincronização de planos Hotmart...\n')

    // Verificar planos existentes (sem usar hotmartId para evitar erro se campo não existir)
    const existingPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { stripePriceId: { contains: 'hotmart' } },
          { hotmartOfferKey: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        stripePriceId: true,
        hotmartOfferKey: true,
        currency: true,
        interval: true,
        amount: true,
        trialPeriodDays: true,
        active: true
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

      // Prioridade 1: Buscar por hotmartId (mais confiável - ID numérico da Hotmart)
      const existingById = planData.hotmartId
        ? await prisma.plan.findUnique({
            where: { hotmartId: planData.hotmartId }
          })
        : null

      if (existingById) {
        // Atualizar plano existente pelo hotmartId
        await prisma.plan.update({
          where: { id: existingById.id },
          data: {
            name: planData.name,
            stripePriceId: planData.stripePriceId,
            hotmartOfferKey: planData.hotmartOfferKey,
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval, // ⚠️ CRÍTICO: Garantir que interval está correto
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`✅ Atualizado (por hotmartId): ${planData.name}`)
        console.log(`   hotmartId: ${planData.hotmartId}`)
        console.log(`   OfferKey: ${planData.hotmartOfferKey}`)
        console.log(`   Interval: ${planData.interval}`)
        if (planData.trialPeriodDays) {
          console.log(`   Trial: ${planData.trialPeriodDays} dias`)
        }
        updated++
      } else if (planData.hotmartOfferKey && existingByOfferKey) {
        // Prioridade 2: Buscar por hotmartOfferKey (fallback)
        await prisma.plan.update({
          where: { id: existingByOfferKey.id },
          data: {
            name: planData.name,
            stripePriceId: planData.stripePriceId,
            hotmartId: planData.hotmartId, // ⚠️ CRÍTICO: Sempre atualizar hotmartId
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval, // ⚠️ CRÍTICO: Garantir que interval está correto
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`✅ Atualizado (por offerKey): ${planData.name}`)
        console.log(`   OfferKey: ${planData.hotmartOfferKey}`)
        console.log(`   Interval: ${planData.interval}`)
        if (planData.trialPeriodDays) {
          console.log(`   Trial: ${planData.trialPeriodDays} dias`)
        }
        updated++
      } else if (existingByPriceId) {
        // Prioridade 3: Atualizar plano existente pelo stripePriceId
        await prisma.plan.update({
          where: { id: existingByPriceId.id },
          data: {
            name: planData.name,
            hotmartOfferKey: planData.hotmartOfferKey,
            hotmartId: planData.hotmartId, // ⚠️ CRÍTICO: Sempre atualizar hotmartId
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval, // ⚠️ CRÍTICO: Garantir que interval está correto
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`✅ Atualizado (por stripePriceId): ${planData.name} (${planData.stripePriceId})`)
        if (planData.hotmartOfferKey) {
          console.log(`   OfferKey: ${planData.hotmartOfferKey}`)
        }
        console.log(`   Interval: ${planData.interval}`)
        if (planData.trialPeriodDays) {
          console.log(`   Trial: ${planData.trialPeriodDays} dias`)
        }
        updated++
      } else {
        // Criar novo plano
        await prisma.plan.create({
          data: {
            name: planData.name,
            stripePriceId: planData.stripePriceId,
            hotmartOfferKey: planData.hotmartOfferKey,
            hotmartId: planData.hotmartId,
            amount: planData.amount,
            currency: planData.currency,
            interval: planData.interval,
            intervalCount: planData.intervalCount,
            trialPeriodDays: planData.trialPeriodDays,
            active: planData.active
          }
        })
        console.log(`➕ Criado: ${planData.name}`)
        console.log(`   stripePriceId: ${planData.stripePriceId}`)
        if (planData.hotmartId) {
          console.log(`   hotmartId: ${planData.hotmartId}`)
        }
        if (planData.hotmartOfferKey) {
          console.log(`   OfferKey: ${planData.hotmartOfferKey}`)
        }
        console.log(`   Interval: ${planData.interval}`)
        console.log(`   Amount: ${planData.amount} ${planData.currency}`)
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

