// src/scripts/restore-marianna-admin.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function restoreMariannaAdmin() {
  console.log('🔧 Restaurando acesso admin da Marianna...')

  try {
    // Busca o usuário da Marianna
    const marianna = await prisma.user.findUnique({
      where: { email: 'marianna.yaskara@mediz.com' }
    })

    if (!marianna) {
      console.log('❌ Usuário marianna.yaskara@mediz.com não encontrado')
      return
    }

    console.log('👤 Usuário encontrado:', marianna.name)

    // Verifica se já é admin
    const isAdmin = marianna.email.includes('@mediz.com')
    
    if (isAdmin) {
      console.log('✅ Usuário já tem acesso admin (email @mediz.com)')
    } else {
      console.log('⚠️ Email não termina com @mediz.com')
    }

    // Atualiza para garantir que é admin
    const updatedUser = await prisma.user.update({
      where: { id: marianna.id },
      data: {
        email: 'marianna.yaskara@mediz.com', // Garante que termina com @mediz.com
        emailVerified: new Date(),
        // Se não tiver senha, cria uma padrão
        ...(marianna.passwordHash ? {} : {
          passwordHash: await bcrypt.hash('adminPassword123', 10)
        })
      }
    })

    console.log('✅ Acesso admin restaurado para:', updatedUser.email)
    console.log('🔑 Senha padrão: adminPassword123 (se não tinha senha)')

    // Verifica subscriptions ativas
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: marianna.id,
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: new Date()
        }
      }
    })

    console.log('💳 Assinaturas ativas:', activeSubscriptions.length)

  } catch (error) {
    console.error('❌ Erro ao restaurar acesso admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  restoreMariannaAdmin()
}

export { restoreMariannaAdmin }
