// src/scripts/create-new-admins.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const newAdmins = [
  {
    name: 'Lenise',
    email: 'lenise@mediz.com',
    password: 'LeniseAdmin2025!'
  },
  {
    name: 'Paulo Barbosa',
    email: 'paulo.barbosa@mediz.com',
    password: 'PauloAdmin2025!'
  }
]

async function createNewAdmins() {
  console.log('👥 Criando novos admins...')

  for (const admin of newAdmins) {
    try {
      // Verifica se já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: admin.email }
      })

      if (existingUser) {
        console.log(`⚠️ Usuário ${admin.email} já existe`)
        
        // Atualiza para garantir que é admin
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: admin.email,
            emailVerified: new Date(),
            passwordHash: await bcrypt.hash(admin.password, 10)
          }
        })
        
        console.log(`✅ Admin ${admin.name} atualizado: ${updatedUser.email}`)
        continue
      }

      // Cria novo admin
      const newAdmin = await prisma.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          passwordHash: await bcrypt.hash(admin.password, 10),
          emailVerified: new Date(),
          appUsage: 'ADMIN',
          gender: 'PREFER_NOT_TO_SAY'
        }
      })

      console.log(`✅ Admin ${admin.name} criado: ${newAdmin.email}`)
      console.log(`🔑 Senha: ${admin.password}`)

    } catch (error) {
      console.error(`❌ Erro ao criar admin ${admin.name}:`, error)
    }
  }

  console.log('\n📋 Resumo dos admins:')
  console.log('1. marianna.yaskara@mediz.com (restaurado)')
  console.log('2. lenise@mediz.com (criado)')
  console.log('3. paulo.barbosa@mediz.com (criado)')
  
  console.log('\n🔐 Credenciais:')
  console.log('- Marianna: adminPassword123 (ou senha existente)')
  console.log('- Lenise: LeniseAdmin2025!')
  console.log('- Paulo: PauloAdmin2025!')

  await prisma.$disconnect()
}

// Executar se chamado diretamente
if (require.main === module) {
  createNewAdmins()
}

export { createNewAdmins }
