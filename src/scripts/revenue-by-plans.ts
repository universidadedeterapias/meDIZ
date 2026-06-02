// src/scripts/revenue-by-plans.ts
// Cálculo de receita/lucro por tipo de plano (mensal, anual) e por plano
import { prisma } from '@/lib/prisma'

const USD_TO_BRL = 6.0 // Ajuste a taxa se quiser total em BRL

async function revenueByPlans() {
  console.log('💰 RECEITA POR PLANOS (assinaturas ativas)\n')
  console.log('='.repeat(60))

  try {
    const now = new Date()

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'ACTIVE', 'cancel_at_period_end'] },
        currentPeriodEnd: { gte: now }
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            interval: true,
            intervalCount: true
          }
        }
      }
    })

    console.log(`\n📊 Total de assinaturas ativas: ${subscriptions.length}\n`)

    if (subscriptions.length === 0) {
      console.log('⚠️  Nenhuma assinatura ativa.')
      await prisma.$disconnect()
      return
    }

    // Por intervalo (Mensal vs Anual)
    const byInterval: Record<string, { totalCents: number; count: number; currency: string }[]> = {}
    // Por plano (nome + moeda)
    const byPlan: Record<string, { totalCents: number; count: number; currency: string; interval: string | null }> = {}
    // Por moeda
    const byCurrency: Record<string, { totalCents: number; count: number }> = {}

    for (const sub of subscriptions) {
      const plan = sub.plan
      const amount = plan.amount ?? 0
      const currency = plan.currency ?? 'BRL'
      const interval = plan.interval ?? 'MONTH'
      const intervalLabel = interval === 'YEAR' ? 'Anual' : 'Mensal'
      const planKey = `${plan.name} (${currency})`

      // Por intervalo
      if (!byInterval[intervalLabel]) byInterval[intervalLabel] = []
      const currByCurrency = byInterval[intervalLabel].find(c => c.currency === currency)
      if (!currByCurrency) {
        byInterval[intervalLabel].push({ totalCents: amount, count: 1, currency })
      } else {
        currByCurrency.totalCents += amount
        currByCurrency.count += 1
      }

      // Por plano
      if (!byPlan[planKey]) {
        byPlan[planKey] = { totalCents: amount, count: 1, currency, interval }
      } else {
        byPlan[planKey].totalCents += amount
        byPlan[planKey].count += 1
      }

      // Por moeda
      if (!byCurrency[currency]) byCurrency[currency] = { totalCents: 0, count: 0 }
      byCurrency[currency].totalCents += amount
      byCurrency[currency].count += 1
    }

    const fmt = (cents: number, currency: string) =>
      currency === 'USD'
        ? `$${(cents / 100).toFixed(2)}`
        : `R$ ${(cents / 100).toFixed(2)}`

    // ---- Por intervalo (Mensal / Anual) ----
    console.log('📅 RECEITA POR TIPO DE PLANO (intervalo)\n')
    for (const [label, list] of Object.entries(byInterval).sort((a, b) => (a[0] > b[0] ? 1 : -1))) {
      console.log(`   ${label}:`)
      for (const { totalCents, count, currency } of list) {
        console.log(`      ${currency}: ${fmt(totalCents, currency)} — ${count} assinatura(s)`)
      }
      const totalCentsLabel = list.reduce((s, c) => s + c.totalCents, 0)
      const mainCurrency = list[0]?.currency ?? 'BRL'
      console.log(`      → Subtotal ${label}: ${fmt(totalCentsLabel, mainCurrency)}\n`)
    }

    // ---- Por plano ----
    console.log('📋 RECEITA POR PLANO (nome)\n')
    const planEntries = Object.entries(byPlan).sort((a, b) => b[1].totalCents - a[1].totalCents)
    for (const [planName, data] of planEntries) {
      const intervalLabel = data.interval === 'YEAR' ? 'Anual' : 'Mensal'
      console.log(`   ${planName}`)
      console.log(`      ${intervalLabel} · ${data.count} assinatura(s) · ${fmt(data.totalCents, data.currency)}`)
    }

    // ---- Por moeda e totais ----
    console.log('\n\n💵 TOTAL POR MOEDA\n')
    let totalBRL = 0
    let totalUSD = 0
    for (const [currency, data] of Object.entries(byCurrency)) {
      const value = data.totalCents / 100
      if (currency === 'USD') {
        totalUSD = data.totalCents
        console.log(`   USD: $${value.toFixed(2)} (${data.count} assinaturas)`)
      } else {
        totalBRL = data.totalCents
        console.log(`   BRL: R$ ${value.toFixed(2)} (${data.count} assinaturas)`)
      }
    }

    console.log('\n   💰 TOTAL GERAL (BRL):')
    const usdInBRL = (totalUSD / 100) * USD_TO_BRL
    console.log(`      Em reais: R$ ${(totalBRL / 100).toFixed(2)}`)
    if (totalUSD > 0) {
      console.log(`      USD convertido (×${USD_TO_BRL}): R$ ${usdInBRL.toFixed(2)}`)
      console.log(`      Soma: R$ ${((totalBRL / 100) + usdInBRL).toFixed(2)}`)
    }

    // MRR (receita recorrente mensal) — mensal conta 1×, anual conta 1/12
    let mrrBRL = 0
    let mrrUSD = 0
    for (const sub of subscriptions) {
      const plan = sub.plan
      const amount = plan.amount ?? 0
      const currency = plan.currency ?? 'BRL'
      if (plan.interval === 'YEAR') {
        if (currency === 'USD') mrrUSD += amount / 12
        else mrrBRL += amount / 12
      } else {
        if (currency === 'USD') mrrUSD += amount
        else mrrBRL += amount
      }
    }
    console.log('\n   📈 MRR (receita recorrente mensal aproximada):')
    console.log(`      BRL: R$ ${(mrrBRL / 100).toFixed(2)}`)
    if (mrrUSD > 0) console.log(`      USD: $${(mrrUSD / 100).toFixed(2)}`)
    console.log(`      Total (BRL): R$ ${((mrrBRL / 100) + (mrrUSD / 100) * USD_TO_BRL).toFixed(2)}`)

    // Assinaturas sem valor
    const withoutAmount = subscriptions.filter(s => !s.plan.amount || s.plan.amount === 0)
    if (withoutAmount.length > 0) {
      console.log(`\n⚠️  ${withoutAmount.length} assinatura(s) sem valor (amount) no plano:`)
      withoutAmount.forEach(s => console.log(`      - ${s.plan.name} (${s.plan.id})`))
    }

    console.log('\n' + '='.repeat(60))
  } catch (e) {
    console.error('Erro:', e)
  } finally {
    await prisma.$disconnect()
  }
}

revenueByPlans()
