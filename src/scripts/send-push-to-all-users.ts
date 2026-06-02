// src/scripts/send-push-to-all-users.ts
import { PrismaClient } from '@prisma/client'
import { sendPushNotification } from '../lib/webPush'

const prisma = new PrismaClient()

/**
 * Script para enviar uma notificação push única para todos os usuários
 * que têm subscriptions ativas registradas
 * 
 * Uso: npm run send-push-to-all
 */
async function sendPushToAllUsers() {
  try {
    console.log('📢 ENVIANDO NOTIFICAÇÃO PUSH PARA TODOS OS USUÁRIOS')
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
      console.log('💡 Certifique-se de que há usuários com notificações push registradas.')
      return
    }

    // Mostrar preview dos usuários
    console.log('👥 Usuários que receberão a notificação:')
    usersWithSubscriptions.slice(0, 10).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name || 'Sem nome'} (${user.email}) - ${user.pushSubscriptions.length} subscription(s)`)
    })
    if (usersWithSubscriptions.length > 10) {
      console.log(`   ... e mais ${usersWithSubscriptions.length - 10} usuários`)
    }

    // Perguntar confirmação (em produção, você pode remover isso ou tornar opcional)
    console.log('\n⚠️  ATENÇÃO: Esta ação enviará uma notificação para TODOS os usuários com subscriptions ativas.')
    console.log('   Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Configuração da notificação
    const notificationPayload = {
      title: '🔔 meDIZ - Notificações Ativadas!',
      body: 'As notificações de lembretes estão funcionando normalmente. Você receberá seus lembretes personalizados no horário agendado!',
      icon: '/imgs/logo192.png',
      badge: '/imgs/logo192.png',
      tag: 'mediz-broadcast',
      data: {
        type: 'broadcast',
        url: '/'
      },
      url: '/'
    }

    console.log('\n📤 Iniciando envio de notificações...\n')

    // Processar em batches de 50 usuários por vez para não sobrecarregar
    const BATCH_SIZE = 50
    let totalSent = 0
    let totalFailed = 0
    const errors: string[] = []

    for (let i = 0; i < usersWithSubscriptions.length; i += BATCH_SIZE) {
      const batch = usersWithSubscriptions.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(usersWithSubscriptions.length / BATCH_SIZE)

      console.log(`📦 Processando batch ${batchNumber}/${totalBatches} (${batch.length} usuários)...`)

      // Processar batch em paralelo
      const batchPromises = batch.map(async (user) => {
        try {
          const result = await sendPushNotification(user.id, notificationPayload)
          
          if (result.success > 0) {
            return { 
              userId: user.id, 
              userName: user.name || user.email,
              success: true,
              sent: result.success,
              failed: result.failed
            }
          } else {
            return { 
              userId: user.id, 
              userName: user.name || user.email,
              success: false,
              sent: 0,
              failed: result.failed,
              errors: result.errors
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
          return { 
            userId: user.id, 
            userName: user.name || user.email,
            success: false,
            sent: 0,
            failed: 1,
            errors: [errorMessage]
          }
        }
      })

      // Aguardar batch completar
      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const userResult = result.value
          if (userResult.success) {
            totalSent += userResult.sent
            totalFailed += userResult.failed
            console.log(`   ✅ ${userResult.userName}: ${userResult.sent} notificação(ões) enviada(s)`)
          } else {
            totalFailed += userResult.failed
            const errorMsg = `   ❌ ${userResult.userName}: Falha ao enviar - ${userResult.errors?.join(', ') || 'Erro desconhecido'}`
            console.log(errorMsg)
            errors.push(errorMsg)
          }
        } else {
          totalFailed++
          const errorMsg = `   ❌ Usuário ${batch[index].name || batch[index].email}: Erro ao processar - ${result.reason}`
          console.log(errorMsg)
          errors.push(errorMsg)
        }
      })

      console.log(`   📊 Batch ${batchNumber} concluído: ${totalSent} enviadas, ${totalFailed} falhas até agora\n`)

      // Pequeno delay entre batches para não sobrecarregar
      if (i + BATCH_SIZE < usersWithSubscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 segundo entre batches
      }
    }

    // Resumo final
    console.log('='.repeat(60))
    console.log('📊 RESUMO FINAL')
    console.log('='.repeat(60))
    console.log(`✅ Total de notificações enviadas: ${totalSent}`)
    console.log(`❌ Total de falhas: ${totalFailed}`)
    console.log(`👥 Total de usuários processados: ${usersWithSubscriptions.length}`)
    console.log(`📈 Taxa de sucesso: ${((totalSent / (totalSent + totalFailed)) * 100).toFixed(2)}%`)

    if (errors.length > 0) {
      console.log(`\n⚠️  Erros encontrados (${errors.length}):`)
      errors.slice(0, 10).forEach(error => console.log(`   ${error}`))
      if (errors.length > 10) {
        console.log(`   ... e mais ${errors.length - 10} erros`)
      }
    }

    console.log('\n✅ Processo concluído!')
    console.log('💡 As notificações foram enviadas. Os usuários receberão em seus dispositivos.')

  } catch (error) {
    console.error('❌ Erro ao enviar notificações:', error)
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
  sendPushToAllUsers()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro no script:', error)
      process.exit(1)
    })
}

export default sendPushToAllUsers
