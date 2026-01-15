import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/webPush'

/**
 * Endpoint para verificar e enviar lembretes agendados
 * Pode ser chamado por cron job ou manualmente (apenas admins)
 * 
 * IMPORTANTE: Usa Node.js runtime e timeout de 10 minutos para processar muitos usuários
 */
export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutos (600 segundos)

export async function GET(req: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:GET',message:'entry',data:{hasUrl:!!req.url,method:'GET'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  const debugLog: string[] = []
  const log = (message: string, data?: unknown) => {
    const logEntry = `[CHECK-REMINDERS] ${new Date().toISOString()} - ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`
    console.log(logEntry)
    debugLog.push(logEntry)
  }

  try {
    log('========== INÍCIO VERIFICAÇÃO DE LEMBRETES ==========')
    
    // Verificar se é chamada por cron (com secret) ou por admin
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET
    const normalizeSecret = (value?: string | null) => (value ? value.replace(/ /g, '+') : null)
    const normalizedSecret = normalizeSecret(secret)
    const normalizedCronSecret = normalizeSecret(cronSecret)
    const userAgent = req.headers.get('user-agent')
    const secretMeta = {
      hasSecret: !!secret,
      secretLength: secret?.length || 0,
      secretHasSpace: secret ? secret.includes(' ') : false,
      secretHasPlus: secret ? secret.includes('+') : false,
      secretHasPercent: secret ? secret.includes('%') : false
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:auth-meta',message:'auth meta',data:{userAgent,searchParamKeys:[...searchParams.keys()],...secretMeta},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    
    // Vercel Cron envia automaticamente o header 'x-vercel-cron' quando é uma chamada de cron job
    const vercelCronHeader = req.headers.get('x-vercel-cron')
    const isVercelCron = vercelCronHeader === '1'

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:auth-input',message:'auth inputs',data:{hasSecret:!!secret,cronSecretPresent:!!cronSecret,vercelCronHeader,searchParamKeys:[...searchParams.keys()],nodeEnv:process.env.NODE_ENV||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    log('Verificando autenticação', { 
      hasSecret: !!secret, 
      hasCronSecret: !!cronSecret,
      isVercelCron,
      secretMatch: secret === cronSecret,
      secretMatchNormalized: !!normalizedSecret && !!normalizedCronSecret && normalizedSecret === normalizedCronSecret
      // Não logar valores de secrets por segurança
    })

    // Se não for cron, verificar se é admin
    // Em desenvolvimento local, aceitar 'local-dev-secret' se CRON_SECRET não estiver configurado
    const isDevelopment = process.env.NODE_ENV !== 'production'
    const validSecret = cronSecret || (isDevelopment ? 'local-dev-secret' : null)
    const normalizedValidSecret = normalizeSecret(validSecret)
    const isCronRequest =
      isVercelCron ||
      (normalizedSecret && normalizedValidSecret && normalizedSecret === normalizedValidSecret)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:auth-result',message:'auth result',data:{isVercelCron,secretMatchNormalized:!!normalizedSecret&&!!normalizedValidSecret&&normalizedSecret===normalizedValidSecret,normalizedSecretLength:normalizedSecret?.length||0,normalizedCronLength:normalizedValidSecret?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:auth-check',message:'auth check',data:{isDevelopment,isVercelCron,hasCronSecret:!!cronSecret,hasValidSecret:!!validSecret,secretProvided:!!secret,isCronRequest},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    log('Verificação de cron request', {
      isDevelopment,
      isVercelCron,
      hasCronSecret: !!cronSecret,
      hasValidSecret: !!validSecret,
      secretProvided: !!secret,
      isCronRequest
      // Não logar valores de secrets por segurança
    })

    const authRequired = false
    if (authRequired && !isCronRequest) {
      const session = await auth()

      if (!session?.user?.id) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:unauth',message:'no session',data:{isCronRequest:false},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        log('❌ Não autenticado')
        return NextResponse.json(
          { error: 'Não autenticado', debugLog },
          { status: 401 }
        )
      }

      const isAdmin = session.user.email?.includes('@mediz.com') || false
      // Não logar email completo por segurança
      const emailDomain = session.user.email?.split('@')[1] || 'unknown'
      log('Verificação de admin', { emailDomain: `@${emailDomain}`, isAdmin })

      if (!isAdmin) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:forbidden',message:'not admin',data:{emailDomain},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        log('❌ Não autorizado (não é admin)')
        return NextResponse.json(
          { error: 'Não autorizado', debugLog },
          { status: 403 }
        )
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:admin',message:'admin auth ok',data:{emailDomain},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      log('✅ Autenticado como admin')
    } else if (authRequired) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/push/check-reminders:cron-ok',message:'cron auth ok',data:{isVercelCron,hasSecret:!!secret},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      log('✅ Autenticado via cron secret')
    } else {
      log('Autenticação removida por solicitação')
    }

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentDay = now.getDay() // 0 = domingo, 6 = sábado
    const currentSeconds = now.getSeconds()

    // Formatar hora atual como HH:mm
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    log('Informações de tempo', {
      now: now.toISOString(),
      currentHour,
      currentMinute,
      currentSeconds,
      currentDay,
      currentTime,
      dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDay]
    })

    // Buscar TODOS os lembretes ativos primeiro para debug
    const allActiveReminders = await prisma.reminder.findMany({
      where: { active: true }
    })
    log('Lembretes ativos no banco (todos)', { 
      total: allActiveReminders.length,
      reminders: allActiveReminders.map(r => ({
        id: r.id,
        time: r.time,
        daysOfWeek: r.daysOfWeek,
        userId: r.userId,
        lastSentAt: r.lastSentAt,
        timeMatch: r.time === currentTime
      }))
    })

    // Buscar lembretes ativos que devem ser enviados agora ou nos últimos 4 minutos
    // Isso permite que o cron execute a cada 5 minutos e ainda capture todos os lembretes
    // Calcula os horários válidos (atual e últimos 4 minutos)
    const validTimes: string[] = [currentTime]
    for (let i = 1; i <= 4; i++) {
      const pastDate = new Date(now)
      pastDate.setMinutes(pastDate.getMinutes() - i)
      const pastTime = `${String(pastDate.getHours()).padStart(2, '0')}:${String(pastDate.getMinutes()).padStart(2, '0')}`
      validTimes.push(pastTime)
    }
    
    const reminders = await prisma.reminder.findMany({
      where: {
        active: true,
        time: {
          in: validTimes
        }
      }
    })

    log('Query executada', {
      query: {
        active: true,
        time: currentTime
      },
      found: reminders.length
    })

    log('Lembretes encontrados para o horário atual e últimos 4 minutos', {
      currentTime,
      validTimes,
      found: reminders.length,
      reminderIds: reminders.map(r => r.id)
    })

    const results = {
      checked: reminders.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    log('Iniciando processamento de lembretes', { total: reminders.length })

    for (const reminder of reminders) {
      try {
        log(`Processando lembrete ${reminder.id}`, {
          title: reminder.title,
          time: reminder.time,
          userId: reminder.userId,
          daysOfWeek: reminder.daysOfWeek,
          lastSentAt: reminder.lastSentAt
        })

        // Verificar se o lembrete deve ser enviado hoje
        const daysOfWeek = JSON.parse(reminder.daysOfWeek) as number[]
        log(`Dias da semana do lembrete ${reminder.id}`, { 
          daysOfWeek, 
          currentDay,
          shouldSend: daysOfWeek.includes(currentDay)
        })

        if (!daysOfWeek.includes(currentDay)) {
          log(`⏭️ Lembrete ${reminder.id} ignorado: não é o dia certo`, {
            reminderDays: daysOfWeek,
            currentDay
          })
          continue // Não é o dia certo
        }

        // Verificar se já foi enviado hoje (evitar duplicatas)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        log(`Verificando lastSentAt para lembrete ${reminder.id}`, {
          lastSentAt: reminder.lastSentAt,
          today: today.toISOString(),
          alreadySent: reminder.lastSentAt ? reminder.lastSentAt >= today : false
        })

        if (reminder.lastSentAt && reminder.lastSentAt >= today) {
          log(`⏭️ Lembrete ${reminder.id} ignorado: já foi enviado hoje`, {
            lastSentAt: reminder.lastSentAt.toISOString(),
            today: today.toISOString()
          })
          continue // Já foi enviado hoje
        }

        // Se userId é null, é um lembrete global - enviar para todos os usuários
        if (reminder.userId === null) {
          log(`📢 Lembrete ${reminder.id} é GLOBAL - enviando para todos os usuários`)
          
          // Buscar todos os usuários (premium e gratuito)
          const allUsers = await prisma.user.findMany({
            select: { id: true }
          })

          log(`Usuários encontrados para lembrete global`, { total: allUsers.length })

          // Processar em batches de 50 usuários por vez para não travar
          const BATCH_SIZE = 50
          let globalSent = 0
          let globalFailed = 0

          for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
            const batch = allUsers.slice(i, i + BATCH_SIZE)
            log(`Processando batch ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(allUsers.length / BATCH_SIZE)} (${batch.length} usuários)`)

            // Processar batch em paralelo
            const batchPromises = batch.map(async (user) => {
              try {
                const sendResult = await sendPushNotification(user.id, {
                  title: reminder.title,
                  body: reminder.message,
                  icon: '/imgs/logo192.png',
                  badge: '/imgs/logo192.png',
                  tag: `reminder-${reminder.id}`,
                  data: {
                    reminderId: reminder.id,
                    type: 'reminder'
                  },
                  url: '/'
                })

                if (sendResult.success > 0) {
                  return { sent: true, failed: false }
                } else {
                  return { sent: false, failed: true, errors: sendResult.errors }
                }
              } catch (error) {
                return { sent: false, failed: true, error: error instanceof Error ? error.message : 'Erro desconhecido' }
              }
            })

            // Aguardar batch completar
            const batchResults = await Promise.allSettled(batchPromises)
            
            batchResults.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                if (result.value.sent) {
                  globalSent++
                } else {
                  globalFailed++
                  if (result.value.errors) {
                    log(`❌ Falha ao enviar para usuário ${batch[index].id}`, result.value.errors)
                  }
                }
              } else {
                globalFailed++
                log(`❌ Erro ao processar usuário ${batch[index].id}`, { error: result.reason })
              }
            })

            log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} concluído: ${globalSent} enviadas, ${globalFailed} falhas`)
          }

          log(`Resultado final do lembrete global ${reminder.id}`, {
            sent: globalSent,
            failed: globalFailed
          })

          if (globalSent > 0) {
            // Atualizar lastSentAt
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { lastSentAt: now }
            })

            results.sent += globalSent
            results.failed += globalFailed
          } else {
            results.failed++
            results.errors.push(`Lembrete global ${reminder.id}: Nenhuma subscription ativa`)
          }
        } else {
          // Lembrete individual - enviar para o usuário específico
          log(`👤 Lembrete ${reminder.id} é INDIVIDUAL - enviando para usuário ${reminder.userId}`)
          
          // Verificar se o usuário tem subscriptions antes de tentar enviar
          const userSubscriptions = await prisma.pushSubscription.findMany({
            where: { userId: reminder.userId }
          })
          
          log(`Subscriptions do usuário ${reminder.userId}`, {
            total: userSubscriptions.length,
            subscriptionIds: userSubscriptions.map(s => s.id)
          })

          if (userSubscriptions.length === 0) {
            log(`❌ Usuário ${reminder.userId} não tem subscriptions registradas`)
            results.failed++
            results.errors.push(`Lembrete ${reminder.id}: Usuário não tem subscriptions registradas`)
            continue
          }

          const sendResult = await sendPushNotification(reminder.userId, {
            title: reminder.title,
            body: reminder.message,
            icon: '/imgs/logo192.png',
            badge: '/imgs/logo192.png',
            tag: `reminder-${reminder.id}`,
            data: {
              reminderId: reminder.id,
              type: 'reminder'
            },
            url: '/'
          })

          log(`Resultado do envio do lembrete ${reminder.id}`, sendResult)

          if (sendResult.success > 0) {
            // Atualizar lastSentAt
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { lastSentAt: now }
            })
            log(`✅ Lembrete ${reminder.id} enviado com sucesso e lastSentAt atualizado`)

            results.sent++
          } else {
            results.failed++
            const errorMsg = `Lembrete ${reminder.id}: ${sendResult.errors.join(', ')}`
            results.errors.push(errorMsg)
            log(`❌ Falha ao enviar lembrete ${reminder.id}`, sendResult.errors)
          }
        }
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        results.errors.push(`Lembrete ${reminder.id}: ${errorMessage}`)
        log(`❌ Erro ao processar lembrete ${reminder.id}`, { error: errorMessage })
      }
    }

    log('========== RESULTADO FINAL ==========', results)
    log('========== FIM VERIFICAÇÃO DE LEMBRETES ==========')

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
      debugLog
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    log(`❌ ERRO CRÍTICO: ${errorMessage}`, { stack: errorStack })
    console.error('[CHECK-REMINDERS] Erro ao verificar lembretes:', error)
    
    // Verificar se é timeout
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT') || errorMessage.includes('maxDuration')) {
      log('⏱️ Timeout detectado - processamento demorou muito')
      return NextResponse.json(
        { 
          error: 'Processamento demorou muito. Tente novamente ou processe em batches menores.',
          timeout: true,
          debugLog: debugLog.slice(-50) // Últimos 50 logs
        },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        debugLog: debugLog.slice(-100) // Últimos 100 logs para não exceder tamanho
      },
      { status: 500 }
    )
  }
}

