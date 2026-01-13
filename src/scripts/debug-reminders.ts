/**
 * Script para debugar o sistema de lembretes
 * 
 * Uso:
 *   npx tsx src/scripts/debug-reminders.ts
 * 
 * Este script verifica:
 * - Lembretes ativos no banco
 * - Subscriptions registradas
 * - Configuração de VAPID keys
 * - Horário atual e timezone
 */

import { prisma } from '../lib/prisma'
import { isVAPIDConfigured } from '../lib/webPush'

async function debugReminders() {
  console.log('🔍 ========== DEBUG DE LEMBRETES ==========\n')

  try {
    // 1. Verificar VAPID keys
    console.log('1️⃣ Verificando VAPID keys...')
    const vapidConfigured = isVAPIDConfigured()
    console.log(`   ✅ VAPID keys configuradas: ${vapidConfigured ? 'SIM' : 'NÃO'}`)
    if (!vapidConfigured) {
      console.log('   ⚠️  Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY')
    }
    console.log()

    // 2. Verificar horário atual
    console.log('2️⃣ Verificando horário atual...')
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentDay = now.getDay()
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    
    console.log(`   📅 Data/Hora: ${now.toISOString()}`)
    console.log(`   🕐 Horário local: ${currentTime}`)
    console.log(`   📆 Dia da semana: ${dayNames[currentDay]} (${currentDay})`)
    console.log(`   🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
    console.log()

    // 3. Buscar todos os lembretes
    console.log('3️⃣ Buscando lembretes no banco...')
    const allReminders = await prisma.reminder.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`   📊 Total de lembretes: ${allReminders.length}`)
    
    const activeReminders = allReminders.filter(r => r.active)
    const inactiveReminders = allReminders.filter(r => !r.active)
    
    console.log(`   ✅ Lembretes ativos: ${activeReminders.length}`)
    console.log(`   ❌ Lembretes inativos: ${inactiveReminders.length}`)
    
    // Mostrar detalhes de todos os lembretes ativos
    if (activeReminders.length > 0) {
      console.log('\n   📋 Detalhes dos lembretes ativos:')
      for (const reminder of activeReminders) {
        const daysOfWeek = JSON.parse(reminder.daysOfWeek) as number[]
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        const daysStr = daysOfWeek.map(d => dayNames[d]).join(', ')
        
        console.log(`\n   📌 ${reminder.title}`)
        console.log(`      ID: ${reminder.id}`)
        console.log(`      Horário: ${reminder.time}`)
        console.log(`      Dias: [${daysOfWeek.join(', ')}] (${daysStr})`)
        console.log(`      Tipo: ${reminder.userId === null ? 'GLOBAL' : 'INDIVIDUAL'}`)
        if (reminder.userId) {
          console.log(`      Usuário: ${reminder.user?.name || 'N/A'} (${reminder.user?.email || 'N/A'})`)
        }
        console.log(`      Último envio: ${reminder.lastSentAt ? reminder.lastSentAt.toLocaleString('pt-BR') : 'Nunca'}`)
        console.log(`      Mensagem: ${reminder.message.substring(0, 50)}...`)
      }
    }
    console.log()

    // 4. Verificar lembretes que deveriam ser enviados agora
    console.log('4️⃣ Verificando lembretes para o horário atual...')
    const remindersForNow = await prisma.reminder.findMany({
      where: {
        active: true,
        time: currentTime
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log(`   🎯 Lembretes encontrados para ${currentTime}: ${remindersForNow.length}`)
    
    if (remindersForNow.length > 0) {
      console.log('\n   📋 Detalhes dos lembretes:')
      for (const reminder of remindersForNow) {
        const daysOfWeek = JSON.parse(reminder.daysOfWeek) as number[]
        const shouldSendToday = daysOfWeek.includes(currentDay)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const alreadySent = reminder.lastSentAt && reminder.lastSentAt >= today

        console.log(`\n   📌 Lembrete ID: ${reminder.id}`)
        console.log(`      Título: ${reminder.title}`)
        console.log(`      Mensagem: ${reminder.message.substring(0, 50)}...`)
        console.log(`      Horário: ${reminder.time}`)
        console.log(`      Dias da semana: [${daysOfWeek.join(', ')}]`)
        console.log(`      Tipo: ${reminder.userId === null ? 'GLOBAL (todos usuários)' : `INDIVIDUAL (usuário: ${reminder.userId})`}`)
        if (reminder.userId) {
          console.log(`      Usuário: ${reminder.user?.name || 'N/A'} (${reminder.user?.email || 'N/A'})`)
        }
        console.log(`      Último envio: ${reminder.lastSentAt ? reminder.lastSentAt.toISOString() : 'Nunca'}`)
        console.log(`      ✅ Deve enviar hoje? ${shouldSendToday ? 'SIM' : 'NÃO'}`)
        console.log(`      ✅ Já foi enviado hoje? ${alreadySent ? 'SIM' : 'NÃO'}`)
        
        if (!shouldSendToday) {
          console.log(`      ⚠️  MOTIVO: Não é o dia certo (lembrete é para dias [${daysOfWeek.join(', ')}], hoje é ${currentDay})`)
        }
        if (alreadySent) {
          console.log(`      ⚠️  MOTIVO: Já foi enviado hoje às ${reminder.lastSentAt?.toISOString()}`)
        }
      }
    } else {
      console.log(`   ⚠️  Nenhum lembrete encontrado para o horário ${currentTime}`)
      console.log(`   💡 Verifique se há lembretes ativos com horário ${currentTime}`)
    }
    console.log()

    // 5. Verificar subscriptions
    console.log('5️⃣ Verificando subscriptions de push notifications...')
    const allSubscriptions = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log(`   📊 Total de subscriptions: ${allSubscriptions.length}`)
    
    if (allSubscriptions.length > 0) {
      // Agrupar por usuário
      const subscriptionsByUser = new Map<string, typeof allSubscriptions>()
      for (const sub of allSubscriptions) {
        if (!subscriptionsByUser.has(sub.userId)) {
          subscriptionsByUser.set(sub.userId, [])
        }
        subscriptionsByUser.get(sub.userId)!.push(sub)
      }

      console.log(`   👥 Usuários com subscriptions: ${subscriptionsByUser.size}`)
      console.log('\n   📋 Detalhes por usuário:')
      
      for (const [userId, subs] of subscriptionsByUser.entries()) {
        const user = subs[0].user
        console.log(`\n   👤 ${user?.name || 'N/A'} (${user?.email || 'N/A'})`)
        console.log(`      ID: ${userId}`)
        console.log(`      Subscriptions: ${subs.length}`)
        for (const sub of subs) {
          console.log(`        - ${sub.id} (${sub.userAgent || 'N/A'})`)
          console.log(`          Criado em: ${sub.createdAt.toISOString()}`)
        }
      }
    } else {
      console.log('   ⚠️  Nenhuma subscription registrada!')
      console.log('   💡 Os usuários precisam permitir notificações no navegador')
    }
    console.log()

    // 6. Verificar lembretes individuais sem subscriptions
    console.log('6️⃣ Verificando lembretes individuais sem subscriptions...')
    const individualReminders = allReminders.filter(r => r.active && r.userId !== null)
    let remindersWithoutSubs = 0
    
    for (const reminder of individualReminders) {
      const userSubs = await prisma.pushSubscription.findMany({
        where: { userId: reminder.userId! }
      })
      
      if (userSubs.length === 0) {
        remindersWithoutSubs++
        const user = await prisma.user.findUnique({
          where: { id: reminder.userId! },
          select: { name: true, email: true }
        })
        console.log(`   ⚠️  Lembrete "${reminder.title}" (${reminder.id})`)
        console.log(`      Usuário: ${user?.name || 'N/A'} (${user?.email || 'N/A'})`)
        console.log(`      Não tem subscriptions registradas`)
      }
    }
    
    if (remindersWithoutSubs === 0) {
      console.log('   ✅ Todos os lembretes individuais têm usuários com subscriptions')
    } else {
      console.log(`   ⚠️  Total de lembretes individuais sem subscriptions: ${remindersWithoutSubs}`)
    }
    console.log()

    // 7. Resumo e recomendações
    console.log('7️⃣ Resumo e recomendações:')
    console.log()
    
    if (!vapidConfigured) {
      console.log('   ❌ PROBLEMA: VAPID keys não configuradas')
      console.log('   💡 SOLUÇÃO: Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env')
      console.log()
    }
    
    if (activeReminders.length === 0) {
      console.log('   ⚠️  AVISO: Nenhum lembrete ativo encontrado')
      console.log('   💡 SOLUÇÃO: Crie e ative lembretes no painel admin')
      console.log()
    }
    
    if (remindersForNow.length === 0 && activeReminders.length > 0) {
      console.log('   ⚠️  AVISO: Nenhum lembrete encontrado para o horário atual')
      console.log(`   💡 SOLUÇÃO: Verifique se há lembretes agendados para ${currentTime}`)
      console.log()
    }
    
    if (allSubscriptions.length === 0) {
      console.log('   ❌ PROBLEMA: Nenhuma subscription registrada')
      console.log('   💡 SOLUÇÃO: Os usuários precisam permitir notificações no navegador')
      console.log()
    }
    
    if (remindersForNow.length > 0) {
      const remindersReadyToSend = remindersForNow.filter(r => {
        const daysOfWeek = JSON.parse(r.daysOfWeek) as number[]
        const shouldSendToday = daysOfWeek.includes(currentDay)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const alreadySent = r.lastSentAt && r.lastSentAt >= today
        return shouldSendToday && !alreadySent
      })
      
      if (remindersReadyToSend.length > 0) {
        console.log(`   ✅ ${remindersReadyToSend.length} lembrete(s) pronto(s) para envio agora`)
        console.log('   💡 Execute o endpoint /api/push/check-reminders para enviar')
        console.log()
      }
    }

    console.log('✅ ========== DEBUG CONCLUÍDO ==========')

  } catch (error) {
    console.error('❌ Erro ao executar debug:', error)
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
debugReminders()

