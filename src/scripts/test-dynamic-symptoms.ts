// Script para testar o sistema de sintomas dinâmicos
// Executa: npm run test-dynamic-symptoms

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

async function testDynamicSymptoms() {
  console.log('🧪 Testando sistema de sintomas dinâmicos...')
  
  try {
    // 1. Testa a API de atualização
    console.log('\n1️⃣ Testando API de atualização...')
    const updateResponse = await fetch('http://localhost:3000/api/symptoms/update-popular', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-secret'
      }
    })
    
    const updateResult = await updateResponse.json()
    
    if (updateResponse.ok) {
      console.log('✅ API de atualização funcionando')
      console.log(`📊 Sintomas processados: ${updateResult.totalProcessados}`)
      console.log(`📋 Top sintomas:`, updateResult.sintomas?.slice(0, 3).map(s => s.sintoma))
    } else {
      console.log('❌ Erro na API de atualização:', updateResult.error)
    }

    // 2. Testa a API pública
    console.log('\n2️⃣ Testando API pública...')
    const publicResponse = await fetch('http://localhost:3000/api/symptoms/popular')
    const publicResult = await publicResponse.json()
    
    if (publicResponse.ok) {
      console.log('✅ API pública funcionando')
      console.log(`📊 Sintomas disponíveis: ${publicResult.sintomas?.length}`)
      console.log(`🔄 Do cache: ${publicResult.fromCache}`)
      console.log(`📋 Top sintomas:`, publicResult.sintomas?.slice(0, 3).map(s => s.sintoma))
    } else {
      console.log('❌ Erro na API pública:', publicResult.error)
    }

    // 3. Verifica arquivos de cache
    console.log('\n3️⃣ Verificando arquivos de cache...')
    const cacheFile = join(process.cwd(), 'cache', 'sintomas-populares.json')
    const logsFile = join(process.cwd(), 'logs', 'sintomas-job-logs.json')
    
    if (existsSync(cacheFile)) {
      console.log('✅ Arquivo de cache criado')
      const cacheData = JSON.parse(require('fs').readFileSync(cacheFile, 'utf-8'))
      console.log(`📅 Última atualização: ${cacheData.ultimaAtualizacao}`)
    } else {
      console.log('⚠️ Arquivo de cache não encontrado')
    }
    
    if (existsSync(logsFile)) {
      console.log('✅ Arquivo de logs criado')
      const logsData = JSON.parse(require('fs').readFileSync(logsFile, 'utf-8'))
      console.log(`📝 Logs disponíveis: ${logsData.length}`)
    } else {
      console.log('⚠️ Arquivo de logs não encontrado')
    }

    // 4. Testa métricas do admin
    console.log('\n4️⃣ Testando métricas do admin...')
    const metricsResponse = await fetch('http://localhost:3000/api/admin/symptoms-metrics', {
      headers: {
        'Cookie': 'next-auth.session-token=test' // Simula admin
      }
    })
    
    if (metricsResponse.status === 403) {
      console.log('✅ Proteção de admin funcionando (403 esperado)')
    } else {
      console.log('⚠️ Status inesperado:', metricsResponse.status)
    }

    console.log('\n🎉 Teste concluído!')
    console.log('\n📋 Próximos passos:')
    console.log('   1. Configure CRON_SECRET no .env')
    console.log('   2. Configure cron job: 0 4 * * 1 (segunda às 04h)')
    console.log('   3. Teste a interface do chat')
    console.log('   4. Verifique métricas no painel admin')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  }
}

// Executa o teste
testDynamicSymptoms()
  .then(() => {
    console.log('🏁 Teste finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })

