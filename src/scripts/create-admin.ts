// src/scripts/create-admin.ts
/**
 * Script para criar um usuário admin
 * 
 * Execução: npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  console.log('🔍 Verificando usuários admin existentes...')
  
  // Verificar se já existe algum usuário admin
  const existingAdmins = await prisma.user.findMany({
    where: {
      email: {
        contains: '@mediz.com'
      }
    }
  })
  
  if (existingAdmins.length > 0) {
    console.log('✅ Usuários admin encontrados:')
    existingAdmins.forEach((admin) => {
      console.log(`- ${admin.email} (${admin.name || 'Sem nome'})`)
    })
    return
  }
  
  console.log('❌ Nenhum usuário admin encontrado. Criando novo usuário admin...')
  
  try {
    // Configurações do usuário admin
    const adminEmail = 'admin@mediz.com'
    const adminPassword = 'adminPassword123' // Alterar para senha segura em produção
    
    // Gerar hash da senha
    const passwordHash = await hash(adminPassword, 10)
    
    // Criar usuário admin
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        passwordHash,
        emailVerified: new Date(),
        fullName: 'Administrador meDIZ',
        whatsapp: '5511999999999',
        age: 30,
        gender: 'MALE',
        profession: 'Administrador',
        appUsage: 'PROFESSIONAL',
        description: 'Usuário administrador do sistema',
        preferredLanguage: 'pt-BR'
      }
    })
    
    console.log(`✅ Usuário admin criado com sucesso:`)
    console.log(`- Email: ${admin.email}`)
    console.log(`- Senha: ${adminPassword}`)
    console.log('\n⚠️ IMPORTANTE: Altere esta senha após o primeiro login!')
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar a função
createAdminUser()
  .catch((error) => {
    console.error('❌ Erro inesperado:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
