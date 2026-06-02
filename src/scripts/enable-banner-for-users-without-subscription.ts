// src/scripts/enable-banner-for-users-without-subscription.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Script para habilitar o banner de notificações para usuários SEM subscription
 * 
 * Isso é útil quando:
 * - Usuários não veem o banner de ativar notificações
 * - Usuários não têm subscription mas notificationsEnabled está true (estado inconsistente)
 * - Quer forçar o banner aparecer para todos os usuários sem subscription
 * 
 * Uso: npm run enable-banner-no-subscription
 */
async function enableBannerForUsersWithoutSubscription() {
  try {
    console.log('🔄 HABILITANDO BANNER DE NOTIFICAÇÕES PARA USUÁRIOS SEM SUBSCRIPTION')
    console.log('='.repeat(70))

    // Buscar todos os usuários SEM subscription
    const usersWithoutSubscriptions = await prisma.user.findMany({
      where: {
        pushSubscriptions: {
          none: {} // Não tem nenhuma subscription
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationsEnabled: true,
        pushSubscriptions: {
          select: {
            id: true
          }
        }
      }
    })

    console.log(`\n📊 TOTAL DE USUÁRIOS SEM SUBSCRIPTION: ${usersWithoutSubscriptions.length}\n`)

    if (usersWithoutSubscriptions.length === 0) {
      console.log('✅ Nenhum usuário encontrado sem subscription. Todos já têm subscriptions!')
      return
    }

    // Separar usuários que precisam ser atualizados
    const usersNeedingUpdate = usersWithoutSubscriptions.filter(
      u => u.notificationsEnabled === true
    )
    const usersAlreadyOk = usersWithoutSubscriptions.filter(
      u => u.notificationsEnabled === false
    )

    console.log('📋 Estatísticas:')
    console.log(`   - Usuários que precisam atualização (notificationsEnabled = true): ${usersNeedingUpdate.length}`)
    console.log(`   - Usuários já OK (notificationsEnabled = false): ${usersAlreadyOk.length}`)

    if (usersNeedingUpdate.length === 0) {
      console.log('\n✅ Todos os usuários sem subscription já estão com notificationsEnabled = false!')
      console.log('💡 O banner já deve aparecer para eles quando acessarem o app')
      return
    }

    // Mostrar preview dos usuários que serão atualizados
    console.log('\n👥 Usuários que terão notificationsEnabled resetado para false:')
    usersNeedingUpdate.slice(0, 10).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name || 'Sem nome'} (${user.email}) - Atualmente: ✅ Ativo`)
    })
    if (usersNeedingUpdate.length > 10) {
      console.log(`   ... e mais ${usersNeedingUpdate.length - 10} usuários`)
    }

    // Perguntar confirmação
    console.log('\n⚠️  ATENÇÃO: Esta ação irá:')
    console.log('   1. Resetar notificationsEnabled = false para usuários SEM subscription')
    console.log('   2. Isso fará o banner de notificações aparecer quando eles acessarem o app')
    console.log('   3. Apenas usuários com notificationsEnabled = true serão atualizados')
    console.log('   4. Usuários já com false não serão alterados')
    console.log('\n   Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('\n🔄 Iniciando atualização...\n')

    // Resetar notificationsEnabled para false apenas para quem precisa
    const updateResult = await prisma.user.updateMany({
      where: {
        id: {
          in: usersNeedingUpdate.map(u => u.id)
        }
      },
      data: {
        notificationsEnabled: false
      }
    })

    console.log(`✅ Atualização concluída!`)
    console.log(`   - Total de usuários atualizados: ${updateResult.count}`)
    console.log(`   - Campo notificationsEnabled resetado para false`)

    // Verificar resultado
    const updatedUsers = await prisma.user.findMany({
      where: {
        id: {
          in: usersNeedingUpdate.map(u => u.id)
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

    // Estatísticas finais
    console.log(`\n📈 Resumo final:`)
    console.log(`   - Total de usuários sem subscription: ${usersWithoutSubscriptions.length}`)
    console.log(`   - Atualizados agora: ${updateResult.count}`)
    console.log(`   - Já estavam OK: ${usersAlreadyOk.length}`)

    console.log('\n✅ Processo concluído!')
    console.log('💡 Agora o banner de notificações aparecerá para usuários sem subscription')
    console.log('💡 O banner aparece nas páginas /chat ou / quando o usuário acessar')

  } catch (error) {
    console.error('❌ Erro ao habilitar banner:', error)
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
  enableBannerForUsersWithoutSubscription()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro no script:', error)
      process.exit(1)
    })
}

export default enableBannerForUsersWithoutSubscription
