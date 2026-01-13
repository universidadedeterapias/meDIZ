/**
 * Script de diagnóstico para problemas do Next.js
 * Verifica configurações, rotas, e problemas comuns
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

console.log('🔍 ========== DIAGNÓSTICO NEXT.JS ==========\n')

// 1. Verificar arquivos de configuração
console.log('1️⃣ Verificando arquivos de configuração...')
const configFiles = [
  'next.config.mjs',
  'tsconfig.json',
  'package.json',
  '.env.local',
  '.env'
]

configFiles.forEach(file => {
  const exists = existsSync(file)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
  if (!exists && (file === '.env.local' || file === '.env')) {
    console.log(`      ⚠️  Arquivo opcional, mas recomendado`)
  }
})

// 2. Verificar variáveis de ambiente críticas
console.log('\n2️⃣ Verificando variáveis de ambiente...')
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
]

requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  const exists = !!value
  const isSecret = varName.includes('SECRET') || varName.includes('PRIVATE') || varName.includes('KEY')
  console.log(`   ${exists ? '✅' : '❌'} ${varName}${isSecret && exists ? ' (configurado - valor não exibido por segurança)' : ''}`)
  if (!exists) {
    console.log(`      ⚠️  Variável obrigatória não encontrada`)
  }
})

// 3. Verificar estrutura de rotas API
console.log('\n3️⃣ Verificando rotas API críticas...')
const apiRoutes = [
  'src/app/api/push/check-reminders/route.ts',
  'src/app/api/push/subscribe/route.ts',
  'src/app/api/push/vapid-public-key/route.ts',
  'src/app/api/auth/[...nextauth]/route.ts'
]

apiRoutes.forEach(route => {
  const exists = existsSync(route)
  console.log(`   ${exists ? '✅' : '❌'} ${route}`)
  
  if (exists) {
    // Verificar se tem runtime configurado
    const content = readFileSync(route, 'utf-8')
    const hasRuntime = content.includes('export const runtime')
    const hasMaxDuration = content.includes('export const maxDuration')
    
    if (route.includes('check-reminders')) {
      if (!hasRuntime) {
        console.log(`      ⚠️  Rota não tem 'export const runtime' configurado`)
      }
      if (!hasMaxDuration) {
        console.log(`      ⚠️  Rota não tem 'export const maxDuration' configurado`)
      }
      if (hasRuntime && hasMaxDuration) {
        console.log(`      ✅ Runtime e timeout configurados`)
      }
    }
  }
})

// 4. Verificar next.config.mjs
console.log('\n4️⃣ Verificando next.config.mjs...')
if (existsSync('next.config.mjs')) {
  const configContent = readFileSync('next.config.mjs', 'utf-8')
  
  const checks = [
    { name: 'webpack config', pattern: /webpack:/ },
    { name: 'symlinks disabled', pattern: /symlinks.*false/ },
    { name: 'eslint ignore', pattern: /ignoreDuringBuilds/ },
    { name: 'typescript ignore', pattern: /ignoreBuildErrors/ }
  ]
  
  checks.forEach(check => {
    const found = check.pattern.test(configContent)
    console.log(`   ${found ? '✅' : '⚠️ '} ${check.name}`)
  })
}

// 5. Verificar se .next existe (cache)
console.log('\n5️⃣ Verificando cache do Next.js...')
const nextCacheExists = existsSync('.next')
if (nextCacheExists) {
  console.log('   ✅ Cache .next existe')
  console.log('   💡 Se houver problemas, tente: rm -rf .next (ou Remove-Item -Recurse -Force .next no PowerShell)')
} else {
  console.log('   ⚠️  Cache .next não existe (normal se nunca rodou npm run dev)')
}

// 6. Verificar porta e servidor
console.log('\n6️⃣ Verificando servidor...')
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXTAUTH_URL || 'http://localhost:3000')
  : 'http://localhost:3000'

async function checkServer() {
  try {
    const response = await fetch(BASE_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    console.log(`   ✅ Servidor está rodando em ${BASE_URL}`)
    console.log(`   📊 Status: ${response.status}`)
  } catch (error) {
    console.log(`   ❌ Servidor não está rodando`)
    console.log(`   💡 Execute: npm run dev`)
  }
}

await checkServer()

// 7. Verificar endpoint específico
console.log('\n7️⃣ Verificando endpoint /api/push/check-reminders...')
try {
  const testUrl = new URL('/api/push/check-reminders', BASE_URL)
  testUrl.searchParams.set('secret', 'local-dev-secret')
  
  const response = await fetch(testUrl.toString(), {
    method: 'GET',
    signal: AbortSignal.timeout(5000)
  })
  
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  
  console.log(`   ${response.ok ? '✅' : '❌'} Endpoint acessível`)
  console.log(`   📊 Status: ${response.status}`)
  console.log(`   📄 Content-Type: ${contentType}`)
  
  if (!isJson) {
    console.log(`   ⚠️  Endpoint retornou HTML ao invés de JSON (pode ser 404)`)
    console.log(`   💡 Verifique se a rota existe e o servidor foi reiniciado`)
  } else {
    const data = await response.json()
    console.log(`   ✅ Resposta JSON válida`)
    if (data.error) {
      console.log(`   ⚠️  Erro na resposta: ${data.error}`)
    }
  }
} catch (error) {
  console.log(`   ❌ Erro ao testar endpoint: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
}

console.log('\n✅ ========== DIAGNÓSTICO CONCLUÍDO ==========')
console.log('\n💡 Próximos passos:')
console.log('   1. Se houver problemas, reinicie o servidor: npm run dev')
console.log('   2. Se persistir, limpe o cache: rm -rf .next')
console.log('   3. Verifique os logs do servidor para mais detalhes')

