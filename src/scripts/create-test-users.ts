// src/scripts/create-test-users.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 CRIANDO USUÁRIOS DE TESTE PARA DIFERENTES PERÍODOS\n')

  const testUsers = [
    { name: 'Teste 1 Dia', email: 'teste1@teste.com', days: 1 },
    { name: 'Teste 3 Dias', email: 'teste3@teste.com', days: 3 },
    { name: 'Teste 6 Dias', email: 'teste6@teste.com', days: 6 },
    { name: 'Teste 7 Dias', email: 'teste7@teste.com', days: 7 },
    { name: 'Teste 8 Dias', email: 'teste8@teste.com', days: 8 },
    { name: 'Teste 15 Dias', email: 'teste15@teste.com', days: 15 },
    { name: 'Teste 29 Dias', email: 'teste29@teste.com', days: 29 },
    { name: 'Teste 30 Dias', email: 'teste30@teste.com', days: 30 },
    { name: 'Teste 31 Dias', email: 'teste31@teste.com', days: 31 },
    { name: 'Teste 60 Dias', email: 'teste60@teste.com', days: 60 }
  ]

  const password = 'Teste123!'
  const hashedPassword = await bcrypt.hash(password, 10)

  for (const user of testUsers) {
    try {
      // Calcula a data de criação
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - user.days)

      // Verifica se o usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (existingUser) {
        console.log(`⚠️  Usuário ${user.email} já existe, atualizando data...`)
        
        await prisma.user.update({
          where: { email: user.email },
          data: {
            createdAt: createdAt,
            passwordHash: hashedPassword
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
            gender: 'PREFER_NOT_TO_SAY'
          }
        })
        
        console.log(`✅ Usuário ${user.email} criado com ${user.days} dias atrás`)
      }
    } catch (error) {
      console.error(`❌ Erro ao criar/atualizar ${user.email}:`, error)
    }
  }

  console.log('\n🎯 USUÁRIOS DE TESTE CRIADOS!')
  console.log('📧 Email: teste[X]@teste.com')
  console.log('🔑 Senha: Teste123!')
  console.log('\n📋 Para testar:')
  console.log('1. Faça login com cada usuário')
  console.log('2. Vá para /chat')
  console.log('3. Observe as restrições aplicadas')
  console.log('4. Verifique se o popup aparece')

  await prisma.$disconnect()
}

main()
