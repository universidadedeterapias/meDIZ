// src/scripts/reset-notifications-banner.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Script para resetar o estado de notificações e forçar o banner aparecer novamente
 * para usuários que têm subscriptions ativas
 * 
 * Isso é útil quando:
 * - O sistema de notificações foi corrigido e precisa reativar
 * - Usuários no iPhone não viram o banner antes
 * - Quer permitir que usuários reativem notificações
 * 
 * Uso: npm run reset-notifications-banner
 */
async function resetNotificationsBanner() {
  try {
    console.log('🔄 RESETANDO BANNER DE NOTIFICAÇÕES PARA TODOS OS USUÁRIOS')
    console.log('='.repeat(60))

    // Buscar todos os usuários que têm subscriptions ativas
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          some: {} // Tem pelo menos uma subscription
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationsEnabled: true,
        pushSubscriptions: {
          select: {
            id: true,
            endpoint: true
          }
        }
      }
    })

    console.log(`\n📊 TOTAL DE USUÁRIOS COM SUBSCRIPTIONS: ${usersWithSubscriptions.length}\n`)

    if (usersWithSubscriptions.length === 0) {
      console.log('❌ Nenhum usuário encontrado com subscriptions ativas.')
      return
    }

    // Mostrar preview
    console.log('👥 Usuários que terão o banner resetado:')
    usersWithSubscriptions.slice(0, 10).forEach((user, index) => {
      const status = user.notificationsEnabled ? '✅ Ativo' : '❌ Inativo'
      console.log(`   ${index + 1}. ${user.name || 'Sem nome'} (${user.email}) - ${status} - ${user.pushSubscriptions.length} subscription(s)`)
    })
    if (usersWithSubscriptions.length > 10) {
      console.log(`   ... e mais ${usersWithSubscriptions.length - 10} usuários`)
    }

    // Perguntar confirmação
    console.log('\n⚠️  ATENÇÃO: Esta ação irá:')
    console.log('   1. Resetar notificationsEnabled = false para todos os usuários com subscriptions')
    console.log('   2. Isso fará o banner de notificações aparecer novamente')
    console.log('   3. As subscriptions existentes NÃO serão deletadas (podem ser reutilizadas)')
    console.log('   4. Os usuários poderão reativar as notificações quando o banner aparecer')
    console.log('\n   Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('\n🔄 Iniciando reset...\n')

    // Resetar notificationsEnabled para false
    const updateResult = await prisma.user.updateMany({
      where: {
        id: {
          in: usersWithSubscriptions.map(u => u.id)
        }
      },
      data: {
        notificationsEnabled: false
      }
    })

    console.log(`✅ Reset concluído!`)
    console.log(`   - Total de usuários atualizados: ${updateResult.count}`)
    console.log(`   - Campo notificationsEnabled resetado para false`)

    // Verificar resultado
    const updatedUsers = await prisma.user.findMany({
      where: {
        id: {
          in: usersWithSubscriptions.map(u => u.id)
        }
      },
      select: {
        id: true,
        email: true,
        notificationsEnabled: true
      }
    })

    const stillEnabled = updatedUsers.filter(u => u.notificationsEnabled === true).length
    const nowDisabled = updatedUsers.filter(u => u.notificationsEnabled === false).length

    console.log(`\n📊 Verificação final:`)
    console.log(`   - Usuários com notificationsEnabled = false: ${nowDisabled}`)
    if (stillEnabled > 0) {
      console.log(`   - ⚠️  Usuários que ainda estão com true: ${stillEnabled} (pode ser normal se foram atualizados durante o processo)`)
    }

    console.log('\n✅ Processo concluído!')
    console.log('💡 Agora o banner de notificações aparecerá novamente para esses usuários')
    console.log('💡 Quando eles ativarem, as subscriptions existentes serão reutilizadas ou novas serão criadas')

  } catch (error) {
    console.error('❌ Erro ao resetar notificações:', error)
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message)
      console.error('   Stack:', error.stack)
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  resetNotificationsBanner()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro no script:', error)
      process.exit(1)
    })
}

export default resetNotificationsBanner
