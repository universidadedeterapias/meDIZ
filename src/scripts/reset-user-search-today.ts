// src/scripts/reset-user-search-today.ts
// One-off: delete today's (UTC calendar day) SEARCH ChatSessions for a specific user
// so their daily free-search quota resets. Cascades to ChatMessage/ChatHandoff/ConversationEvent.
process.env.DEV_PREMIUM_BYPASS = 'false'
import { prisma } from '@/lib/prisma'

async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('Uso: npx tsx src/scripts/reset-user-search-today.ts <email>')

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
  if (!user) throw new Error('Usuário não encontrado')

  const startOfUtcDay = new Date()
  startOfUtcDay.setUTCHours(0, 0, 0, 0)

  const todaySessions = await prisma.chatSession.findMany({
    where: { userId: user.id, chatKind: 'SEARCH', createdAt: { gte: startOfUtcDay } },
    select: { id: true, createdAt: true }
  })

  console.log(`Usuário: ${user.email} (${user.id})`)
  console.log(`Início do dia UTC considerado: ${startOfUtcDay.toISOString()}`)
  console.log(`Sessões de busca de hoje (UTC) a remover: ${todaySessions.length}`)
  todaySessions.forEach(s => console.log(`  - ${s.id} — ${s.createdAt.toISOString()}`))

  if (todaySessions.length === 0) {
    console.log('Nada a remover.')
    return
  }

  const result = await prisma.chatSession.deleteMany({
    where: { id: { in: todaySessions.map(s => s.id) } }
  })

  console.log(`✅ Removidas ${result.count} sessões. Cota do dia zerada.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
