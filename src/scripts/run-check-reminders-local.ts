/**
 * Script para executar a verificação de lembretes localmente
 * Simula o que o cron job faria na produção
 * 
 * Uso:
 *   npm run check-reminders-local
 * 
 * Ou para executar continuamente (a cada minuto):
 *   npm run check-reminders-local -- --watch
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Forçar localhost em desenvolvimento local
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXTAUTH_URL || 'http://localhost:3000')
  : 'http://localhost:3000'

const CRON_SECRET = process.env.CRON_SECRET || 'local-dev-secret'

async function checkServerRunning(): Promise<boolean> {
  try {
    const healthUrl = new URL('/', BASE_URL)
    const response = await fetch(healthUrl.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 segundos de timeout
    })
    return response.ok || response.status === 404 // 404 é OK, significa que o servidor está rodando
  } catch (error) {
    return false
  }
}

async function runCheckReminders() {
  const url = new URL('/api/push/check-reminders', BASE_URL)
  url.searchParams.set('secret', CRON_SECRET)

  console.log(`\n🔄 Executando verificação de lembretes...`)
  // Não mostrar URL completa com secret por segurança
  const safeUrl = new URL(url.toString())
  safeUrl.searchParams.set('secret', '***')
  console.log(`📡 URL: ${safeUrl.toString()}\n`)

  // Verificar se o servidor está rodando
  console.log('🔍 Verificando se o servidor está rodando...')
  const serverRunning = await checkServerRunning()
  
  if (!serverRunning) {
    console.error('❌ Servidor não está rodando!')
    console.error('   💡 Execute o servidor primeiro: npm run dev')
    return { success: false, error: 'Servidor não está rodando' }
  }
  
  console.log('✅ Servidor está rodando\n')

  try {
    const startTime = Date.now()
    
    // Adicionar timeout de 5 minutos para processar muitos usuários
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000) // 5 minutos
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId)
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('❌ Resposta não é JSON!')
      console.error('   Status:', response.status, response.statusText)
      console.error('   Content-Type:', contentType)
      console.error('   Resposta (primeiros 500 chars):', text.substring(0, 500))
      
      if (response.status === 404) {
        console.error('\n💡 O servidor pode não estar rodando!')
        console.error('   Execute: npm run dev')
      }
      
      return { success: false, error: 'Resposta não é JSON' }
    }

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ ERRO:', data.error || 'Erro desconhecido')
      
      if (data.debugLog) {
        console.log('\n📋 LOGS DE DEBUG:')
        console.log('─'.repeat(80))
        data.debugLog.forEach((log: string) => console.log(log))
        console.log('─'.repeat(80))
      }
      
      return { success: false, data }
    }

    // Exibir resultado resumido
    console.log('✅ Verificação concluída!')
    console.log(`⏱️  Tempo: ${duration}ms`)
    console.log(`📊 Status: ${response.status}`)
    console.log(`\n📈 RESULTADOS:`)
    console.log(`   ✅ Lembretes verificados: ${data.checked || 0}`)
    console.log(`   📤 Notificações enviadas: ${data.sent || 0}`)
    console.log(`   ❌ Falhas: ${data.failed || 0}`)
    
    if (data.errors && data.errors.length > 0) {
      console.log(`\n   ⚠️  ERROS:`)
      data.errors.forEach((error: string) => {
        console.log(`      - ${error}`)
      })
    }
    
    console.log(`\n   🕐 Timestamp: ${data.timestamp}`)

    // Exibir logs de debug se houver
    if (data.debugLog && data.debugLog.length > 0) {
      console.log(`\n📋 LOGS DETALHADOS (${data.debugLog.length} entradas):`)
      console.log('─'.repeat(80))
      data.debugLog.forEach((log: string) => {
        // Filtrar logs muito verbosos, mostrar apenas os importantes
        if (
          log.includes('❌') || 
          log.includes('✅') || 
          log.includes('⚠️') ||
          log.includes('MOTIVO') ||
          log.includes('RESULTADO') ||
          log.includes('INÍCIO') ||
          log.includes('FIM')
        ) {
          console.log(log)
        }
      })
      console.log('─'.repeat(80))
      console.log(`\n💡 Para ver TODOS os logs, execute: npm run test-check-reminders`)
    }

    return { success: true, data }

  } catch (error) {
    console.error('❌ Erro ao executar verificação:', error)
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message)
    }
    return { success: false, error }
  }
}

// Verificar se deve executar em modo watch
const args = process.argv.slice(2)
const watchMode = args.includes('--watch') || args.includes('-w')

if (watchMode) {
  console.log('👀 Modo watch ativado - executando no segundo 0 de cada minuto...')
  console.log('   Pressione Ctrl+C para parar\n')

  // Função para calcular o próximo segundo 0
  function getNextMinuteStart(): number {
    const now = new Date()
    const nextMinute = new Date(now)
    nextMinute.setMinutes(now.getMinutes() + 1)
    nextMinute.setSeconds(0)
    nextMinute.setMilliseconds(0)
    const delay = nextMinute.getTime() - now.getTime()
    return delay > 0 ? delay : 60000 // Se já passou, aguardar 1 minuto
  }

  // Função para executar no segundo 0
  function scheduleExecution() {
    const delay = getNextMinuteStart()
    const nextExecution = new Date(Date.now() + delay)
    console.log(`⏰ Próxima execução: ${nextExecution.toLocaleTimeString()} (em ${Math.round(delay / 1000)} segundos)`)
    
    setTimeout(() => {
      runCheckReminders().then(() => {
        // Após executar, agendar próxima (60 segundos depois)
        scheduleExecution()
      }).catch(() => {
        // Mesmo em caso de erro, agendar próxima
        scheduleExecution()
      })
    }, delay)
  }

  // Agendar primeira execução para o próximo segundo 0
  scheduleExecution()
} else {
  // Executar uma vez
  runCheckReminders().then(() => {
    process.exit(0)
  }).catch((error) => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })
}

