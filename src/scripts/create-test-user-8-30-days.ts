// src/scripts/create-test-user-8-30-days.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 CRIANDO USUÁRIO DE TESTE (8-30 DIAS SEM PREMIUM)\n')

  const testUsers = [
    {
      name: 'Teste Usuário 8 Dias',
      email: 'teste8dias@teste.com',
      days: 8,
      description: 'Usuário com 8 dias de cadastro - deve ver popup e ter visualização limitada'
    },
    {
      name: 'Teste Usuário 15 Dias',
      email: 'teste15dias@teste.com',
      days: 15,
      description: 'Usuário com 15 dias de cadastro - deve ver popup e ter visualização limitada'
    },
    {
      name: 'Teste Usuário 25 Dias',
      email: 'teste25dias@teste.com',
      days: 25,
      description: 'Usuário com 25 dias de cadastro - deve ver popup e ter visualização limitada'
    },
    {
      name: 'Teste Usuário 30 Dias',
      email: 'teste30dias@teste.com',
      days: 30,
      description: 'Usuário com 30 dias de cadastro - deve ver popup e ter visualização limitada'
    }
  ]

  const password = 'Teste123!'
  const hashedPassword = await bcrypt.hash(password, 10)

  console.log('📋 USUÁRIOS DE TESTE A SEREM CRIADOS:\n')

  for (const user of testUsers) {
    try {
      // Calcula a data de criação (X dias atrás)
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - user.days)

      // Verifica se o usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (existingUser) {
        console.log(`⚠️  Usuário ${user.email} já existe, atualizando...`)
        
        await prisma.user.update({
          where: { email: user.email },
          data: {
            createdAt: createdAt,
            passwordHash: hashedPassword,
            // Garante que não tem subscription ativa
            subscriptions: {
              deleteMany: {
                status: {
                  in: ['active', 'ACTIVE', 'cancel_at_period_end']
                }
              }
            }
          }
        })
        
        console.log(`✅ Usuário ${user.email} atualizado para ${user.days} dias atrás`)
      } else {
        await prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            passwordHash: hashedPassword,
            createdAt: createdAt,
            emailVerified: new Date(),
            appUsage: 'PERSONAL',
            gender: 'PREFER_NOT_TO_SAY',
            fullName: user.name,
            age: 30,
            profession: 'Teste',
            description: user.description
          }
        })
        
        console.log(`✅ Usuário ${user.email} criado com ${user.days} dias atrás`)
      }

      // Verifica as regras aplicadas
      const userPeriod = getUserPeriod(createdAt)
      const limits = getUserLimits(userPeriod)
      
      console.log(`   📊 Período: ${userPeriod}`)
      console.log(`   🔍 Limite de pesquisas: ${limits.searchLimit}`)
      console.log(`   👁️  Visualização completa: ${limits.fullVisualization ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`   🎯 Deve ver popup: ${limits.fullVisualization ? '❌ NÃO' : '✅ SIM'}`)
      console.log('')

    } catch (error) {
      console.error(`❌ Erro ao criar/atualizar ${user.email}:`, error)
    }
  }

  console.log('🎯 USUÁRIOS DE TESTE CRIADOS!')
  console.log('📧 Emails: teste[X]dias@teste.com')
  console.log('🔑 Senha: Teste123!')
  console.log('\n📋 PARA TESTAR AS RESTRIÇÕES:')
  console.log('1. Faça login com qualquer um dos usuários acima')
  console.log('2. Vá para /chat')
  console.log('3. Digite uma consulta (ex: "Cansaço")')
  console.log('4. Observe:')
  console.log('   - Deve aparecer popup após 2 segundos')
  console.log('   - Conteúdo deve ter blur após "Símbolos Biológicos"')
  console.log('   - Limite de pesquisas deve ser aplicado')
  console.log('\n🔍 VALIDAÇÃO:')
  console.log('- Usuários 8-30 dias: visualização limitada + popup')
  console.log('- Usuários 1-7 dias: visualização completa + sem popup')
  console.log('- Usuários 31+ dias: visualização limitada + popup')

  await prisma.$disconnect()
}

main()
