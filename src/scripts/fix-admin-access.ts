// src/scripts/fix-admin-access.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function fixAdminAccess() {
  try {
    console.log('🔧 CORRIGINDO ACESSO ADMIN')
    console.log('=' .repeat(50))

    // 1. Verificar usuário marianna
    console.log('\n1. 👤 VERIFICANDO USUÁRIO MARIANNA:')
    let marianna = await prisma.user.findUnique({
      where: { email: 'marianna.yaskara@mediz.com' }
    })

    if (!marianna) {
      console.log('❌ Usuário não encontrado, criando...')
      marianna = await prisma.user.create({
        data: {
          email: 'marianna.yaskara@mediz.com',
          name: 'Marianna Yaskara',
          passwordHash: await bcrypt.hash('adminPassword123', 10),
          emailVerified: new Date()
        }
      })
      console.log('✅ Usuário criado com sucesso')
    } else {
      console.log('✅ Usuário encontrado:', marianna.name)
    }

    // 2. Verificar se email está correto
    console.log('\n2. 📧 VERIFICANDO EMAIL:')
    console.log(`   Email atual: ${marianna.email}`)
    console.log(`   Termina com @mediz.com: ${marianna.email.includes('@mediz.com') ? '✅ Sim' : '❌ Não'}`)

    if (!marianna.email.includes('@mediz.com')) {
      console.log('🔧 Corrigindo email...')
      marianna = await prisma.user.update({
        where: { id: marianna.id },
        data: { email: 'marianna.yaskara@mediz.com' }
      })
      console.log('✅ Email corrigido')
    }

    // 3. Verificar/atualizar senha
    console.log('\n3. 🔑 VERIFICANDO SENHA:')
    console.log(`   Senha configurada: ${marianna.passwordHash ? '✅ Sim' : '❌ Não'}`)

    if (!marianna.passwordHash) {
      console.log('🔧 Criando senha...')
      marianna = await prisma.user.update({
        where: { id: marianna.id },
        data: { 
          passwordHash: await bcrypt.hash('adminPassword123', 10)
        }
      })
      console.log('✅ Senha criada')
    }

    // 4. Testar senhas comuns
    console.log('\n4. 🧪 TESTANDO SENHAS:')
    const testPasswords = [
      'adminPassword123',
      'Admin123!',
      'admin123',
      'Admin123',
      'password'
    ]

    for (const password of testPasswords) {
      try {
        const isValid = await bcrypt.compare(password, marianna.passwordHash!)
        if (isValid) {
          console.log(`   ✅ SENHA VÁLIDA: "${password}"`)
        }
      } catch {
        // Ignorar erros
      }
    }

    // 5. Verificar configuração de ambiente
    console.log('\n5. ⚙️ CONFIGURAÇÃO DE AMBIENTE:')
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Não configurado'}`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)

    // 6. Verificar sessões existentes
    console.log('\n6. 🔐 LIMPANDO SESSÕES ANTIGAS:')
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        user: {
          email: 'marianna.yaskara@mediz.com'
        }
      }
    })
    console.log(`   ✅ ${deletedSessions.count} sessões antigas removidas`)

    // 7. Instruções finais
    console.log('\n7. 🎯 CREDENCIAIS FINAIS:')
    console.log('   Email: marianna.yaskara@mediz.com')
    console.log('   Senha: adminPassword123')
    console.log('   URL: http://localhost:3001/admin-login')

    console.log('\n' + '=' .repeat(50))
    console.log('✅ CORREÇÃO CONCLUÍDA!')
    console.log('\n💡 TESTE AGORA:')
    console.log('1. Acesse: http://localhost:3001/admin-login')
    console.log('2. Use as credenciais acima')
    console.log('3. Se ainda não funcionar, limpe o cache do navegador')

  } catch (error) {
    console.error('❌ Erro na correção:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixAdminAccess()
    .then(() => {
      console.log('✅ Script concluído')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default fixAdminAccess
