// src/scripts/add-hotmart-plans-direct.ts
// Script para cadastrar diretamente os planos Hotmart baseado no print
import { PrismaClient, PlanInterval } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🌱 Cadastrando planos Hotmart diretamente...\n')

    // Plano Mensal - código do print: price_1RcsjzA
    await prisma.plan.upsert({
      where: { stripePriceId: 'price_1RcsjzA' },
      update: {
        name: 'Assin Mensal 30D|free',
        interval: PlanInterval.MONTH,
        intervalCount: 1
      },
      create: {
        name: 'Assin Mensal 30D|free',
        stripePriceId: 'price_1RcsjzA',
        interval: PlanInterval.MONTH,
        intervalCount: 1,
        active: true
      }
    })
    console.log('✅ Plano Mensal: price_1RcsjzA -> MONTH')

    // Plano Anual - código do print: price_1Rd9st
    await prisma.plan.upsert({
      where: { stripePriceId: 'price_1Rd9st' },
      update: {
        name: 'meDIZ Assin Anual 30D - Free',
        interval: PlanInterval.YEAR,
        intervalCount: 1
      },
      create: {
        name: 'meDIZ Assin Anual 30D - Free',
        stripePriceId: 'price_1Rd9st',
        interval: PlanInterval.YEAR,
        intervalCount: 1,
        active: true
      }
    })
    console.log('✅ Plano Anual: price_1Rd9st -> YEAR')

    console.log('\n🎉 Planos cadastrados com sucesso!')
    console.log('\n📌 Variáveis para Vercel:')
    console.log('   HOTMART_MONTHLY_PRICE_CODE=price_1RcsjzA')
    console.log('   HOTMART_YEARLY_PRICE_CODE=price_1Rd9st')
  } catch (err) {
    console.error('❌ Erro:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

