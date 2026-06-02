// src/scripts/verify-stripe-plans.ts
// Script para verificar quais planos do Stripe estão cadastrados no banco
// e identificar possíveis problemas de sincronização

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()

// Inicializar Stripe apenas se tiver a chave
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

async function main() {
  try {
    console.log('🔍 Verificando planos do Stripe no banco de dados...\n')

    // 1. Buscar todos os planos que parecem ser do Stripe (começam com "price_")
    const stripePlansInDb = await prisma.plan.findMany({
      where: {
        stripePriceId: {
          startsWith: 'price_'
        }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        stripePriceId: true,
        interval: true,
        amount: true,
        currency: true,
        active: true,
        stripeProductId: true,
        createdAt: true
      }
    })

    console.log(`📊 Total de planos com stripePriceId começando com "price_": ${stripePlansInDb.length}\n`)

    if (stripePlansInDb.length === 0) {
      console.log('⚠️ Nenhum plano do Stripe encontrado no banco.')
    } else {
      console.log('📋 PLANOS DO STRIPE NO BANCO:\n')
      
      stripePlansInDb.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name}`)
        console.log(`   ID Banco: ${plan.id}`)
        console.log(`   stripePriceId: ${plan.stripePriceId}`)
        console.log(`   stripeProductId: ${plan.stripeProductId || 'NULL'}`)
        console.log(`   Intervalo: ${plan.interval || 'NULL'}`)
        console.log(`   Valor: ${plan.amount ? `${plan.currency?.toUpperCase() || 'BRL'} ${(plan.amount / 100).toFixed(2)}` : 'NULL'}`)
        console.log(`   Ativo: ${plan.active ? '✅' : '❌'}`)
        console.log(`   Criado em: ${plan.createdAt.toISOString()}`)
        console.log('')
      })

      // 2. Verificar se o Stripe está configurado e validar os planos
      if (stripe) {
        console.log('\n🔍 Validando planos no Stripe...\n')
        
        const validPlans: string[] = []
        const invalidPlans: string[] = []
        const errors: Array<{ priceId: string; error: string }> = []

        for (const plan of stripePlansInDb) {
          try {
            const price = await stripe.prices.retrieve(plan.stripePriceId)
            validPlans.push(plan.stripePriceId)
            console.log(`✅ ${plan.name} (${plan.stripePriceId}) - Válido no Stripe`)
            console.log(`   Produto: ${price.product} | Ativo: ${price.active ? 'Sim' : 'Não'}`)
          } catch (err: unknown) {
            const error = err instanceof Error ? err.message : 'Erro desconhecido'
            invalidPlans.push(plan.stripePriceId)
            errors.push({ priceId: plan.stripePriceId, error })
            console.log(`❌ ${plan.name} (${plan.stripePriceId}) - NÃO encontrado no Stripe`)
            console.log(`   Erro: ${error}`)
          }
        }

        console.log('\n📊 RESUMO DA VALIDAÇÃO:')
        console.log(`   ✅ Planos válidos no Stripe: ${validPlans.length}`)
        console.log(`   ❌ Planos inválidos/não encontrados: ${invalidPlans.length}`)

        if (invalidPlans.length > 0) {
          console.log('\n⚠️ PLANOS COM PROBLEMAS:')
          invalidPlans.forEach(priceId => {
            const plan = stripePlansInDb.find(p => p.stripePriceId === priceId)
            const error = errors.find(e => e.priceId === priceId)
            console.log(`   - ${plan?.name || priceId}`)
            console.log(`     stripePriceId: ${priceId}`)
            console.log(`     Erro: ${error?.error || 'Desconhecido'}`)
          })
        }
      } else {
        console.log('\n⚠️ STRIPE_SECRET_KEY não configurada. Pulando validação no Stripe.')
        console.log('   Configure a variável de ambiente para validar os planos.')
      }
    }

    // 3. Verificar planos que NÃO são do Stripe (provavelmente Hotmart)
    const nonStripePlans = await prisma.plan.findMany({
      where: {
        NOT: {
          stripePriceId: {
            startsWith: 'price_'
          }
        }
      },
      select: {
        name: true,
        stripePriceId: true,
        active: true,
        hotmartOfferKey: true
      }
    })

    console.log(`\n📊 Planos que NÃO são do Stripe (provavelmente Hotmart): ${nonStripePlans.length}`)
    if (nonStripePlans.length > 0) {
      console.log('   (Esses planos não serão reconhecidos pelo webhook do Stripe)')
      nonStripePlans.forEach(p => {
        console.log(`   - ${p.name} (${p.stripePriceId}) ${p.active ? '✅' : '❌'}`)
      })
    }

    // 4. Verificar planos ativos do Stripe
    const activeStripePlans = stripePlansInDb.filter(p => p.active)
    console.log(`\n✅ Planos do Stripe ATIVOS: ${activeStripePlans.length}`)
    if (activeStripePlans.length > 0) {
      activeStripePlans.forEach(p => {
        console.log(`   - ${p.name} (${p.stripePriceId})`)
      })
    }

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error)
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


