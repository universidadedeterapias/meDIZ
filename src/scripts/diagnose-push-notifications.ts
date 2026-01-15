/**
 * Script de diagnóstico completo para notificações push
 * Verifica todos os pontos críticos sem modificar nada
 * 
 * Uso:
 *   npx tsx src/scripts/diagnose-push-notifications.ts
 */

import { prisma } from '../lib/prisma'
import { isVAPIDConfigured, getVAPIDPublicKey } from '../lib/webPush'

async function diagnosePushNotifications() {
  console.log('🔍 ========== DIAGNÓSTICO COMPLETO DE NOTIFICAÇÕES PUSH ==========\n')

  try {
    // 1. Verificar VAPID keys
    console.log('1️⃣ VERIFICANDO VAPID KEYS')
    console.log('─'.repeat(60))
    const vapidConfigured = isVAPIDConfigured()
    const vapidPublicKey = getVAPIDPublicKey()
    
    console.log(`   ✅ VAPID keys configuradas: ${vapidConfigured ? 'SIM' : 'NÃO'}`)
    console.log(`   📋 Chave pública presente: ${vapidPublicKey ? 'SIM' : 'NÃO'}`)
    if (vapidPublicKey) {
      console.log(`   📏 Tamanho da chave pública: ${vapidPublicKey.length} caracteres`)
      console.log(`   🔑 Preview: ${vapidPublicKey.substring(0, 20)}...${vapidPublicKey.substring(vapidPublicKey.length - 10)}`)
    }
    
    const hasPublicKeyEnv = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const hasPrivateKeyEnv = !!process.env.VAPID_PRIVATE_KEY
    console.log(`   🔐 NEXT_PUBLIC_VAPID_PUBLIC_KEY no .env: ${hasPublicKeyEnv ? 'SIM' : 'NÃO'}`)
    console.log(`   🔐 VAPID_PRIVATE_KEY no .env: ${hasPrivateKeyEnv ? 'SIM' : 'NÃO'}`)
    
    if (!vapidConfigured) {
      console.log('   ❌ PROBLEMA CRÍTICO: VAPID keys não configuradas!')
      console.log('   💡 SOLUÇÃO: Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY')
    }
    console.log()

    // 2. Verificar subscriptions no banco
    console.log('2️⃣ VERIFICANDO SUBSCRIPTIONS NO BANCO')
    console.log('─'.repeat(60))
    const allSubscriptions = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`   📊 Total de subscriptions: ${allSubscriptions.length}`)
    
    if (allSubscriptions.length === 0) {
      console.log('   ❌ PROBLEMA: Nenhuma subscription registrada!')
      console.log('   💡 SOLUÇÃO: Usuários precisam permitir notificações no navegador')
    } else {
      // Agrupar por usuário
      const subscriptionsByUser = new Map<string, typeof allSubscriptions>()
      allSubscriptions.forEach(sub => {
        if (!subscriptionsByUser.has(sub.userId)) {
          subscriptionsByUser.set(sub.userId, [])
        }
        subscriptionsByUser.get(sub.userId)!.push(sub)
      })

      console.log(`   👥 Usuários com subscriptions: ${subscriptionsByUser.size}`)
      console.log()
      console.log('   📋 Detalhes por usuário:')
      
      subscriptionsByUser.forEach((subs, userId) => {
        const user = subs[0].user
        console.log(`\n   👤 Usuário: ${user.name || 'N/A'} (${user.email})`)
        console.log(`      ID: ${userId}`)
        console.log(`      Subscriptions: ${subs.length}`)
        subs.forEach((sub, index) => {
          console.log(`      ${index + 1}. Subscription ID: ${sub.id}`)
          console.log(`         Endpoint: ${sub.endpoint.substring(0, 50)}...`)
          console.log(`         Criada em: ${sub.createdAt.toISOString()}`)
          console.log(`         Atualizada em: ${sub.updatedAt.toISOString()}`)
          console.log(`         User Agent: ${sub.userAgent || 'N/A'}`)
        })
      })
    }
    console.log()

    // 3. Verificar lembretes ativos
    console.log('3️⃣ VERIFICANDO LEMBRETES ATIVOS')
    console.log('─'.repeat(60))
    const allReminders = await prisma.reminder.findMany({
      where: { active: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`   📊 Total de lembretes ativos: ${allReminders.length}`)
    
    if (allReminders.length === 0) {
      console.log('   ⚠️  Nenhum lembrete ativo encontrado')
    } else {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentDay = now.getDay()
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      
      console.log(`   🕐 Horário atual: ${currentTime}`)
      console.log(`   📆 Dia da semana: ${dayNames[currentDay]} (${currentDay})`)
      console.log(`   🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
      console.log()

      // Calcular horários válidos (atual e últimos 4 minutos)
      const validTimes: string[] = [currentTime]
      for (let i = 1; i <= 4; i++) {
        const pastDate = new Date(now)
        pastDate.setMinutes(pastDate.getMinutes() - i)
        const pastTime = `${String(pastDate.getHours()).padStart(2, '0')}:${String(pastDate.getMinutes()).padStart(2, '0')}`
        validTimes.push(pastTime)
      }

      const remindersForNow = allReminders.filter(r => validTimes.includes(r.time))
      console.log(`   🎯 Lembretes para horário atual (${currentTime}) ou últimos 4 minutos: ${remindersForNow.length}`)
      console.log(`   📋 Horários válidos verificados: ${validTimes.join(', ')}`)
      console.log()

      if (remindersForNow.length > 0) {
        console.log('   📋 Detalhes dos lembretes encontrados:')
        remindersForNow.forEach((reminder, index) => {
          const daysOfWeek = JSON.parse(reminder.daysOfWeek) as number[]
          const shouldSendToday = daysOfWeek.includes(currentDay)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const alreadySent = reminder.lastSentAt && reminder.lastSentAt >= today

          console.log(`\n   ${index + 1}. Lembrete ID: ${reminder.id}`)
          console.log(`      Título: ${reminder.title}`)
          console.log(`      Mensagem: ${reminder.message.substring(0, 50)}${reminder.message.length > 50 ? '...' : ''}`)
          console.log(`      Horário: ${reminder.time}`)
          console.log(`      Dias da semana: [${daysOfWeek.join(', ')}]`)
          console.log(`      Tipo: ${reminder.userId === null ? 'GLOBAL (todos usuários)' : `INDIVIDUAL (usuário: ${reminder.userId})`}`)
          if (reminder.userId) {
            console.log(`      Usuário: ${reminder.user?.name || 'N/A'} (${reminder.user?.email || 'N/A'})`)
          }
          console.log(`      Último envio: ${reminder.lastSentAt ? reminder.lastSentAt.toISOString() : 'Nunca'}`)
          console.log(`      ✅ Deve enviar hoje? ${shouldSendToday ? 'SIM' : 'NÃO'}`)
          console.log(`      ✅ Já foi enviado hoje? ${alreadySent ? 'SIM' : 'NÃO'}`)
          
          // Verificar se usuário tem subscriptions (se for individual)
          if (reminder.userId) {
            const userSubs = allSubscriptions.filter(s => s.userId === reminder.userId)
            console.log(`      📱 Subscriptions do usuário: ${userSubs.length}`)
            if (userSubs.length === 0) {
              console.log(`      ❌ PROBLEMA: Usuário não tem subscriptions registradas!`)
            }
          }
          
          if (!shouldSendToday) {
            console.log(`      ⚠️  MOTIVO: Não é o dia certo (lembrete é para dias [${daysOfWeek.join(', ')}], hoje é ${currentDay})`)
          }
          if (alreadySent) {
            console.log(`      ⚠️  MOTIVO: Já foi enviado hoje às ${reminder.lastSentAt?.toISOString()}`)
          }
          if (shouldSendToday && !alreadySent) {
            console.log(`      ✅ STATUS: Pronto para envio!`)
          }
        })
      } else {
        console.log(`   ⚠️  Nenhum lembrete encontrado para o horário atual`)
        console.log(`   💡 Verifique se há lembretes ativos com horário ${currentTime}`)
      }
    }
    console.log()

    // 4. Verificar configuração de logs
    console.log('4️⃣ VERIFICANDO CONFIGURAÇÃO DE LOGS')
    console.log('─'.repeat(60))
    const nodeEnv = process.env.NODE_ENV || 'unknown'
    const isDevelopment = nodeEnv === 'development'
    const isProduction = nodeEnv === 'production'
    
    console.log(`   🌍 NODE_ENV: ${nodeEnv}`)
    console.log(`   🔧 Modo desenvolvimento: ${isDevelopment ? 'SIM' : 'NÃO'}`)
    console.log(`   🚀 Modo produção: ${isProduction ? 'SIM' : 'NÃO'}`)
    
    if (isProduction) {
      console.log(`   ⚠️  PROBLEMA: Em produção, logs de webPush.ts estão DESABILITADOS!`)
      console.log(`   💡 IMPACTO: Erros de envio não aparecem nos logs`)
      console.log(`   💡 IMPACTO: Subscriptions expiradas podem não ser removidas`)
      console.log(`   📍 Localização: src/lib/webPush.ts:37-42`)
    }
    console.log()

    // 5. Verificar última execução do cron
    console.log('5️⃣ VERIFICANDO ÚLTIMA EXECUÇÃO')
    console.log('─'.repeat(60))
    const remindersWithLastSent = await prisma.reminder.findMany({
      where: {
        active: true,
        lastSentAt: { not: null }
      },
      orderBy: {
        lastSentAt: 'desc'
      },
      take: 5
    })

    if (remindersWithLastSent.length > 0) {
      console.log(`   📊 Últimos ${remindersWithLastSent.length} lembretes enviados:`)
      remindersWithLastSent.forEach((reminder, index) => {
        console.log(`   ${index + 1}. Lembrete ${reminder.id} - Último envio: ${reminder.lastSentAt?.toISOString()}`)
      })
    } else {
      console.log(`   ⚠️  Nenhum lembrete foi enviado ainda (lastSentAt é null em todos)`)
    }
    console.log()

    // 6. Resumo e recomendações
    console.log('6️⃣ RESUMO E DIAGNÓSTICO')
    console.log('─'.repeat(60))
    
    const problems: string[] = []
    const warnings: string[] = []

    if (!vapidConfigured) {
      problems.push('VAPID keys não configuradas')
    }

    if (allSubscriptions.length === 0) {
      problems.push('Nenhuma subscription registrada')
    }

    if (allReminders.length === 0) {
      warnings.push('Nenhum lembrete ativo')
    }

    if (isProduction) {
      warnings.push('Logs desabilitados em produção (impossível debugar erros)')
    }

    const remindersReady = allReminders.filter(r => {
      const daysOfWeek = JSON.parse(r.daysOfWeek) as number[]
      const currentDay = new Date().getDay()
      const shouldSendToday = daysOfWeek.includes(currentDay)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const alreadySent = r.lastSentAt && r.lastSentAt >= today
      return shouldSendToday && !alreadySent
    })

    if (remindersReady.length > 0) {
      const remindersWithoutSubs = remindersReady.filter(r => {
        if (r.userId === null) return false // Global sempre tem usuários
        const userSubs = allSubscriptions.filter(s => s.userId === r.userId)
        return userSubs.length === 0
      })

      if (remindersWithoutSubs.length > 0) {
        problems.push(`${remindersWithoutSubs.length} lembrete(s) pronto(s) para envio mas usuário(s) sem subscriptions`)
      }
    }

    console.log(`   ✅ Subscriptions registradas: ${allSubscriptions.length}`)
    console.log(`   ✅ Lembretes ativos: ${allReminders.length}`)
    console.log(`   ✅ Lembretes prontos para envio agora: ${remindersReady.length}`)
    console.log()

    if (problems.length > 0) {
      console.log('   ❌ PROBLEMAS ENCONTRADOS:')
      problems.forEach((problem, index) => {
        console.log(`      ${index + 1}. ${problem}`)
      })
      console.log()
    }

    if (warnings.length > 0) {
      console.log('   ⚠️  AVISOS:')
      warnings.forEach((warning, index) => {
        console.log(`      ${index + 1}. ${warning}`)
      })
      console.log()
    }

    if (problems.length === 0 && warnings.length === 0) {
      console.log('   ✅ Nenhum problema crítico encontrado!')
      console.log('   💡 Se notificações ainda não chegam, verifique:')
      console.log('      1. Logs do servidor em produção')
      console.log('      2. Resposta do endpoint /api/push/check-reminders')
      console.log('      3. Erros do webpush.sendNotification')
    }

    console.log()
    console.log('✅ ========== DIAGNÓSTICO CONCLUÍDO ==========')

  } catch (error) {
    console.error('❌ Erro ao executar diagnóstico:', error)
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
diagnosePushNotifications()
