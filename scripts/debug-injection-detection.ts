/**
 * 🐛 Script de Debug: Detecção de Injeção
 * 
 * Testa valores comuns para identificar falsos positivos
 */

import { detectInjection } from '@/lib/security/injection-detector'

const testCases = [
  // Casos legítimos que NÃO devem ser detectados
  { name: 'Nome simples', value: { fullName: 'João Silva' }, expected: false },
  { name: 'Nome com parênteses', value: { fullName: 'João Silva (Filho)' }, expected: false },
  { name: 'Email', value: { email: 'joao@example.com' }, expected: false },
  { name: 'Telefone', value: { whatsapp: '+55 (11) 99999-9999' }, expected: false },
  { name: 'Descrição com hashtag', value: { description: 'Texto com #hashtag aqui' }, expected: false },
  { name: 'URL', value: { link: 'https://example.com/path' }, expected: false },
  { name: 'Data', value: { date: '2024-01-15' }, expected: false },
  { name: 'Texto com dois pontos', value: { text: 'Item 1: descrição' }, expected: false },
  { name: 'Número decimal', value: { price: '100.50' }, expected: false },
  
  // Casos maliciosos que DEVEM ser detectados
  { name: 'SQL Injection clássico', value: { fullName: "'; DROP TABLE users; --" }, expected: true },
  { name: 'Command Injection', value: { command: "; rm -rf /" }, expected: true },
  { name: 'Union Select', value: { query: "UNION SELECT * FROM users" }, expected: true },
]

console.log('🐛 Debug: Testando Detecção de Injeção\n')
console.log('═'.repeat(60))

let passed = 0
let failed = 0

for (const testCase of testCases) {
  const detections = detectInjection({
    body: testCase.value
  })
  
  const detected = detections.length > 0
  const passedTest = detected === testCase.expected
  
  if (passedTest) {
    passed++
    console.log(`✅ ${testCase.name}`)
    if (detected) {
      console.log(`   Detectado: ${detections[0].type} - ${detections[0].pattern}`)
    }
  } else {
    failed++
    console.log(`❌ ${testCase.name}`)
    console.log(`   Esperado: ${testCase.expected ? 'DETECTAR' : 'NÃO DETECTAR'}`)
    console.log(`   Resultado: ${detected ? 'DETECTOU' : 'NÃO DETECTOU'}`)
    if (detected) {
      console.log(`   Detecção: ${detections[0].type} - ${detections[0].pattern}`)
      console.log(`   Valor: ${JSON.stringify(testCase.value)}`)
    }
  }
  console.log()
}

console.log('═'.repeat(60))
console.log(`📊 Resultados: ${passed} passaram, ${failed} falharam`)

if (failed > 0) {
  console.log('\n⚠️  Alguns testes falharam. Verifique os padrões acima.')
  process.exit(1)
} else {
  console.log('\n✅ Todos os testes passaram!')
}

