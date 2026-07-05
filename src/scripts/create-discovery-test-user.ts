// src/scripts/create-discovery-test-user.ts
//
// Cria (ou reseta) um unico usuario de teste pronto pra cair no gate de descoberta:
// - emailVerified ja setado (sem precisar de WhatsApp)
// - form completo (fullName/age/gender/profession/appUsage/description), sem precisar passar por /form
// - createdAt = agora, e qualquer UserProfile/DiscoveryEvent anterior removido, pra poder
//   repetir o teste do zero toda vez que rodar este script.
//
// Uso: npm run create-discovery-test-user
// Depois: garanta DISCOVERY_ENABLED=true e DISCOVERY_ROLLOUT_STARTED_AT no passado no .env,
// reinicie o `next dev`, e faca login com as credenciais impressas abaixo.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TEST_EMAIL = 'discovery-test@teste.com'
const TEST_PASSWORD = 'Teste123!'

async function main() {
  console.log('🧪 Criando/resetando usuário de teste para a descoberta...\n')

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10)
  const now = new Date()

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: {
      name: 'Discovery Teste',
      fullName: 'Discovery Teste',
      email: TEST_EMAIL,
      passwordHash: hashedPassword,
      emailVerified: now,
      createdAt: now,
      age: 30,
      gender: 'PREFER_NOT_TO_SAY',
      profession: 'Teste',
      appUsage: 'PERSONAL',
      description: 'Conta de teste para validar o fluxo de descoberta.'
    },
    update: {
      passwordHash: hashedPassword,
      emailVerified: now,
      createdAt: now,
      age: 30,
      gender: 'PREFER_NOT_TO_SAY',
      profession: 'Teste',
      appUsage: 'PERSONAL',
      fullName: 'Discovery Teste',
      description: 'Conta de teste para validar o fluxo de descoberta.'
    },
    select: { id: true, email: true, createdAt: true }
  })

  // Remove qualquer estado anterior de descoberta para permitir repetir o teste.
  const deletedEvents = await prisma.discoveryEvent.deleteMany({ where: { userId: user.id } })
  const deletedProfile = await prisma.userProfile.deleteMany({ where: { userId: user.id } })

  console.log(`✅ Usuário pronto: ${user.email}`)
  console.log(`🔑 Senha: ${TEST_PASSWORD}`)
  console.log(`📅 createdAt: ${user.createdAt.toISOString()}`)
  console.log(
    `🧹 Estado anterior removido: ${deletedProfile.count} UserProfile, ${deletedEvents.count} DiscoveryEvent`
  )

  const enabled = process.env.DISCOVERY_ENABLED === 'true'
  const rolloutStartedAt = process.env.DISCOVERY_ROLLOUT_STARTED_AT

  console.log('\n📋 Antes de testar, confira no seu .env:')
  console.log(`   DISCOVERY_ENABLED=true          ${enabled ? '✅ já está' : '❌ não está — defina e reinicie o dev server'}`)
  console.log(
    `   DISCOVERY_ROLLOUT_STARTED_AT=<data no passado, ex: 2026-01-01T00:00:00.000Z>   ${
      rolloutStartedAt ? `✅ já está (${rolloutStartedAt})` : '❌ não está — defina e reinicie o dev server'
    }`
  )
  console.log('\nDepois: faça login e acesse /chat — deve redirecionar para /descoberta.')
  console.log('Pode rodar este script de novo a qualquer momento pra resetar e testar outra vez.')

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('❌ Erro ao criar usuário de teste:', error)
  process.exit(1)
})
