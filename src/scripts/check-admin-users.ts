// src/scripts/check-admin-users.ts
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAdminUsers() {
  try {
    console.log('🔍 VERIFICANDO USUÁRIOS ADMIN ATIVOS')
    console.log('=' .repeat(50))

    // 1. Buscar todos os usuários admin
    const adminUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@mediz.com'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log(`\n📊 TOTAL DE USUÁRIOS ADMIN: ${adminUsers.length}`)

    if (adminUsers.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado!')
      console.log('💡 Execute: npm run create-admin')
      return
    }

    // 2. Verificar cada usuário admin
    for (const user of adminUsers) {
      console.log(`\n👤 USUÁRIO: ${user.email}`)
      console.log(`   Nome: ${user.name || 'Sem nome'}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Criado em: ${user.createdAt.toLocaleString()}`)
      console.log(`   Atualizado em: ${user.updatedAt.toLocaleString()}`)
      console.log(`   Senha configurada: ${user.passwordHash ? '✅ Sim' : '❌ Não'}`)

      // 3. Testar senhas comuns
      if (user.passwordHash) {
        const commonPasswords = [
          'Admin123!',
          'adminPassword123',
          'admin123',
          'Admin123',
          'password',
          '123456'
        ]

        console.log('   🔑 Testando senhas comuns:')
        for (const password of commonPasswords) {
          try {
            const isValid = await compare(password, user.passwordHash)
            if (isValid) {
              console.log(`   ✅ SENHA ENCONTRADA: "${password}"`)
              break
            }
          } catch {
            // Ignorar erros de comparação
          }
        }
      }
    }

    // 4. Verificar configuração de ambiente
    console.log('\n⚙️ CONFIGURAÇÃO DE AMBIENTE:')
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Não configurado'}`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)

    // 5. Verificar sessões ativas
    console.log('\n🔐 SESSÕES ATIVAS:')
    const sessions = await prisma.session.findMany({
      where: {
        user: {
          email: {
            contains: '@mediz.com'
          }
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        expires: 'desc'
      }
    })

    if (sessions.length === 0) {
      console.log('   ❌ Nenhuma sessão ativa para admins')
    } else {
      console.log(`   ✅ Encontradas ${sessions.length} sessões ativas:`)
      sessions.forEach(session => {
        const isExpired = session.expires < new Date()
        console.log(`      - ${session.user?.email || 'Desconhecido'}`)
        console.log(`        Expira em: ${session.expires.toLocaleString()}`)
        console.log(`        Status: ${isExpired ? '❌ Expirada' : '✅ Ativa'}`)
      })
    }

    // 6. Instruções para corrigir
    console.log('\n💡 INSTRUÇÕES PARA CORRIGIR:')
    console.log('1. Se nenhum admin foi encontrado:')
    console.log('   npm run create-admin')
    console.log('')
    console.log('2. Se admin existe mas senha não funciona:')
    console.log('   npm run restore-marianna')
    console.log('')
    console.log('3. Para criar novos admins:')
    console.log('   npm run create-new-admins')
    console.log('')
    console.log('4. Testar login com:')
    if (adminUsers.length > 0) {
      console.log(`   Email: ${adminUsers[0].email}`)
      console.log('   Senha: Admin123! (ou a senha encontrada acima)')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar usuários admin:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkAdminUsers()
    .then(() => {
      console.log('\n✅ Verificação concluída!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default checkAdminUsers
