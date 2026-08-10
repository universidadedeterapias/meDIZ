// src/scripts/check-user-search-limit.ts
process.env.DEV_PREMIUM_BYPASS = 'false' // avoid local .env bypass masking real prod status
import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
import { hasComplimentaryAccess } from '@/lib/complimentaryAccess'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'

async function main() {
  const email = process.argv[2] || 'Anderlise_kuhn@hotmail.com'
  console.log(`🔍 Verificando limite de pesquisas: ${email}\n`)

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, createdAt: true }
  })

  if (!user) {
    console.log('❌ Usuário não encontrado')
    return
  }

  console.log(`✅ Usuário: ${user.name || user.email}`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Criado em: ${user.createdAt.toISOString()}`)

  const premium = await isUserPremium(user.id)
  console.log(`   Premium: ${premium}`)
  console.log(`   Complimentary access: ${hasComplimentaryAccess(user.email, user.id)}`)

  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, status: true, currentPeriodStart: true, currentPeriodEnd: true,
      createdAt: true, plan: { select: { name: true } }
    }
  })
  console.log(`   Assinaturas (${subs.length}):`)
  subs.forEach(s => console.log(`     - ${s.plan?.name} | status=${s.status} | período: ${s.currentPeriodStart.toISOString()} -> ${s.currentPeriodEnd.toISOString()}`))

  const period = getUserPeriod(user.createdAt)
  const { searchLimit, fullVisualization } = getUserLimits(period)
  console.log(`   Período: ${period} (limite: ${searchLimit}/dia, visualização completa: ${fullVisualization})\n`)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todaySessions = await prisma.chatSession.findMany({
    where: { userId: user.id, chatKind: 'SEARCH', createdAt: { gte: startOfDay } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true }
  })

  console.log(`📅 Início do "dia" considerado pelo servidor (local/UTC): ${startOfDay.toISOString()}`)
  console.log(`🔎 Pesquisas hoje: ${todaySessions.length} / ${searchLimit}`)
  todaySessions.forEach((s, i) => console.log(`   ${i + 1}. ${s.id} — ${s.createdAt.toISOString()}`))

  const last10 = await prisma.chatSession.findMany({
    where: { userId: user.id, chatKind: 'SEARCH' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, createdAt: true }
  })

  console.log(`\n🕘 Últimas pesquisas (até 10, qualquer dia):`)
  last10.forEach((s, i) => console.log(`   ${i + 1}. ${s.id} — ${s.createdAt.toISOString()}`))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
