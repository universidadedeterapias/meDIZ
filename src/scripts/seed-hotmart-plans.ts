// src/scripts/seed-hotmart-plans.ts
import { PrismaClient, PlanInterval } from '@prisma/client'

const prisma = new PrismaClient()

async function upsertPlan(
  stripePriceId: string,
  name: string,
  interval: PlanInterval,
  amount?: number | null,
  currency: string = 'brl'
) {
  const existing = await prisma.plan.findUnique({ where: { stripePriceId } })
  if (existing) {
    await prisma.plan.update({
      where: { id: existing.id },
      data: {
        name,
        interval,
        intervalCount: 1,
        amount: amount ?? existing.amount ?? null,
        currency
      }
    })
    console.log(`✅ Atualizado: ${name} (${stripePriceId}) -> ${interval}`)
  } else {
    await prisma.plan.create({
      data: {
        name,
        stripePriceId,
        interval,
        intervalCount: 1,
        amount: amount ?? null,
        currency,
        active: true
      }
    })
    console.log(`✅ Criado: ${name} (${stripePriceId}) -> ${interval}`)
  }
}

async function main() {
  try {
    console.log('🌱 Seed/Upsert de planos Hotmart\n')

    // Primeiro, tenta usar variáveis de ambiente (para Vercel/produção)
    let monthlyCode = process.env.HOTMART_MONTHLY_PRICE_CODE
    let yearlyCode = process.env.HOTMART_YEARLY_PRICE_CODE

    // Se não encontrar nas env vars, usa valores padrão baseados no print do usuário
    if (!monthlyCode) {
      console.log('⚠️ HOTMART_MONTHLY_PRICE_CODE não definido. Usando valor padrão: price_1RcsjzA')
      monthlyCode = 'price_1RcsjzA' // Código do print: Assin Mensal 30D|free
    }

    if (!yearlyCode) {
      console.log('⚠️ HOTMART_YEARLY_PRICE_CODE não definido. Usando valor padrão: price_1Rd9st')
      yearlyCode = 'price_1Rd9st' // Código do print: meDIZ Assin Anual 30D - Free
    }

    const monthlyName = process.env.HOTMART_MONTHLY_PLAN_NAME || 'Assin Mensal 30D|free'
    const yearlyName = process.env.HOTMART_YEARLY_PLAN_NAME || 'meDIZ Assin Anual 30D - Free'

    // Valores opcionais em centavos, se quiser exibir preço no admin
    const monthlyAmount = process.env.HOTMART_MONTHLY_AMOUNT
      ? Number(process.env.HOTMART_MONTHLY_AMOUNT)
      : undefined
    const yearlyAmount = process.env.HOTMART_YEARLY_AMOUNT
      ? Number(process.env.HOTMART_YEARLY_AMOUNT)
      : undefined

    console.log(`📝 Cadastrando planos:`)
    console.log(`   Mensal: ${monthlyName} (${monthlyCode}) -> MONTH`)
    console.log(`   Anual: ${yearlyName} (${yearlyCode}) -> YEAR\n`)

    await upsertPlan(monthlyCode, monthlyName, PlanInterval.MONTH, monthlyAmount)
    await upsertPlan(yearlyCode, yearlyName, PlanInterval.YEAR, yearlyAmount)

    console.log('\n🎉 Planos Hotmart atualizados com sucesso!')
    console.log('\n📌 IMPORTANTE: Configure estas variáveis na Vercel:')
    console.log(`   HOTMART_MONTHLY_PRICE_CODE=${monthlyCode}`)
    console.log(`   HOTMART_YEARLY_PRICE_CODE=${yearlyCode}`)
  } catch (err) {
    console.error('❌ Erro ao cadastrar/atualizar planos:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export default main


