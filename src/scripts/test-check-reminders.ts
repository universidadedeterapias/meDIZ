/**
 * Script para testar o endpoint de verificação de lembretes
 * 
 * Uso:
 *   npx tsx src/scripts/test-check-reminders.ts
 * 
 * Este script chama o endpoint /api/push/check-reminders
 * e exibe os resultados detalhados
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

async function testCheckReminders() {
  console.log('🧪 ========== TESTE DO ENDPOINT CHECK-REMINDERS ==========\n')
  console.log(`🌐 Usando URL: ${BASE_URL}`)
  console.log(`🔑 CRON_SECRET: ${CRON_SECRET ? 'Configurado (não exibido por segurança)' : 'Não configurado'}\n`)

  // Verificar se o servidor está rodando
  console.log('🔍 Verificando se o servidor está rodando...')
  const serverRunning = await checkServerRunning()
  
  if (!serverRunning) {
    console.error('❌ Servidor não está rodando!')
    console.error('   💡 Execute o servidor primeiro: npm run dev')
    process.exit(1)
  }
  
  console.log('✅ Servidor está rodando\n')

  try {
    // Construir URL com secret
    const url = new URL('/api/push/check-reminders', BASE_URL)
    
    url.searchParams.set('secret', CRON_SECRET)
    console.log('✅ Usando CRON_SECRET para autenticação')
    
    // Não mostrar URL completa com secret por segurança
    const safeUrl = new URL(url.toString())
    safeUrl.searchParams.set('secret', '***')
    console.log(`\n📡 Fazendo requisição para: ${safeUrl.toString()}`)
    console.log()

    const startTime = Date.now()
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`⏱️  Tempo de resposta: ${duration}ms`)
    console.log(`📊 Status HTTP: ${response.status} ${response.statusText}`)
    console.log()

    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('❌ Resposta não é JSON!')
      console.error('   Content-Type:', contentType)
      console.error('   Resposta (primeiros 500 chars):', text.substring(0, 500))
      
      if (response.status === 404) {
        console.error('\n💡 O servidor pode não estar rodando ou a rota não existe')
        console.error('   Certifique-se de que o servidor está rodando: npm run dev')
      }
      
      return
    }

    const data = await response.json()

    if (!response.ok) {
      console.log('❌ ERRO NA RESPOSTA:')
      console.log(JSON.stringify(data, null, 2))
      
      if (data.debugLog) {
        console.log('\n📋 LOGS DE DEBUG:')
        data.debugLog.forEach((log: string) => console.log(`   ${log}`))
      }
      
      return
    }

    console.log('✅ RESPOSTA RECEBIDA:')
    console.log(JSON.stringify(data, null, 2))
    console.log()

    // Exibir logs de debug se disponíveis
    if (data.debugLog && data.debugLog.length > 0) {
      console.log('📋 LOGS DE DEBUG:')
      console.log('─'.repeat(80))
      data.debugLog.forEach((log: string) => {
        console.log(log)
      })
      console.log('─'.repeat(80))
      console.log()
    }

    // Resumo
    console.log('📊 RESUMO:')
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
    console.log()

    if (data.sent > 0) {
      console.log('✅ SUCESSO! Notificações foram enviadas')
    } else if (data.checked === 0) {
      console.log('⚠️  Nenhum lembrete encontrado para o horário atual')
    } else if (data.failed > 0) {
      console.log('⚠️  Lembretes encontrados mas falharam ao enviar')
      console.log('   💡 Verifique os logs acima para mais detalhes')
    } else {
      console.log('ℹ️  Nenhuma notificação foi enviada (pode ser normal se não houver lembretes para agora)')
    }

    console.log('\n✅ ========== TESTE CONCLUÍDO ==========')

  } catch (error) {
    console.error('❌ Erro ao testar endpoint:', error)
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Executar
testCheckReminders()

