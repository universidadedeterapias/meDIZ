/**
 * 🧪 Script de Teste: Alertas de Injeção
 * 
 * Este script testa se o sistema de detecção e alertas está funcionando corretamente.
 * 
 * Uso:
 *   tsx scripts/test-injection-alerts.ts
 */

import { detectInjection } from '@/lib/security/injection-detector'
import { processInjectionDetection } from '@/lib/security/injection-alert-service'
import { NextRequest } from 'next/server'

async function testInjectionDetection() {
  console.log('🧪 Testando Sistema de Detecção de Injeção\n')
  
  // Teste 1: SQL Injection
  console.log('📋 Teste 1: SQL Injection')
  const sqlPayload = {
    fullName: "'; DROP TABLE users; --",
    age: 30
  }
  
  const sqlDetections = detectInjection({
    body: sqlPayload
  })
  
  console.log('  Detecções encontradas:', sqlDetections.length)
  if (sqlDetections.length > 0) {
    console.log('  ✅ SQL Injection detectado:', {
      type: sqlDetections[0].type,
      severity: sqlDetections[0].severity,
      pattern: sqlDetections[0].pattern
    })
  } else {
    console.log('  ❌ FALHA: SQL Injection não detectado')
  }
  
  // Teste 2: Command Injection
  console.log('\n📋 Teste 2: Command Injection')
  const cmdPayload = {
    command: "; rm -rf /",
    file: "test.txt"
  }
  
  const cmdDetections = detectInjection({
    body: cmdPayload
  })
  
  console.log('  Detecções encontradas:', cmdDetections.length)
  if (cmdDetections.length > 0) {
    console.log('  ✅ Command Injection detectado:', {
      type: cmdDetections[0].type,
      severity: cmdDetections[0].severity,
      pattern: cmdDetections[0].pattern
    })
  } else {
    console.log('  ❌ FALHA: Command Injection não detectado')
  }
  
  // Teste 3: Valor Seguro (não deve detectar)
  console.log('\n📋 Teste 3: Valor Seguro')
  const safePayload = {
    fullName: "João Silva",
    age: 30,
    email: "joao@example.com"
  }
  
  const safeDetections = detectInjection({
    body: safePayload
  })
  
  console.log('  Detecções encontradas:', safeDetections.length)
  if (safeDetections.length === 0) {
    console.log('  ✅ Valor seguro não gerou falso positivo')
  } else {
    console.log('  ⚠️  ATENÇÃO: Falso positivo detectado')
  }
  
  // Teste 4: Processamento de Alerta (apenas simulação)
  console.log('\n📋 Teste 4: Processamento de Alerta')
  
  if (sqlDetections.length > 0) {
    try {
      // Criar requisição mock
      const mockReq = new NextRequest('http://localhost:3000/api/user/form', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'Test Agent'
        }
      })
      
      console.log('  Tentando processar alerta...')
      const result = await processInjectionDetection(
        sqlDetections[0],
        mockReq,
        '/api/user/form',
        'test-user-id'
      )
      
      console.log('  ✅ Alerta processado:', {
        attemptId: result.attemptId,
        alertSent: result.alertSent
      })
    } catch (error: any) {
      console.log('  ⚠️  Erro ao processar alerta (pode ser normal se DB não estiver configurado):', error.message)
    }
  }
  
  console.log('\n✅ Testes concluídos!')
  console.log('\n📝 Notas:')
  console.log('  - Os testes acima verificam apenas a detecção')
  console.log('  - Para testar envio real de WhatsApp, precisa de DB configurado')
  console.log('  - Verifique os logs do servidor para mais detalhes')
}

testInjectionDetection().catch(console.error)

