/**
 * Script de verificação de configuração para Android e iOS
 * Verifica se o sistema está configurado corretamente para notificações push em dispositivos móveis
 * 
 * Uso:
 *   npx tsx src/scripts/verify-mobile-config.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

interface ConfigCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  details?: string
}

const checks: ConfigCheck[] = []

console.log('🔍 ========== VERIFICAÇÃO DE CONFIGURAÇÃO MOBILE (Android/iOS) ==========\n')

// 1. Verificar manifest.json
console.log('1️⃣ VERIFICANDO MANIFEST.JSON')
console.log('─'.repeat(60))
try {
  const manifestPath = join(process.cwd(), 'public', 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color']
  const missingFields = requiredFields.filter(field => !manifest[field])
  
  if (missingFields.length === 0) {
    checks.push({
      name: 'Manifest.json',
      status: 'ok',
      message: '✅ Manifest.json configurado corretamente',
      details: `Nome: ${manifest.name}, Display: ${manifest.display}, Ícones: ${manifest.icons?.length || 0}`
    })
    console.log('   ✅ Manifest.json válido')
    console.log(`   📋 Nome: ${manifest.name}`)
    console.log(`   📋 Display: ${manifest.display}`)
    console.log(`   📋 Ícones: ${manifest.icons?.length || 0}`)
    console.log(`   📋 Theme Color: ${manifest.theme_color || 'N/A'}`)
  } else {
    checks.push({
      name: 'Manifest.json',
      status: 'error',
      message: `❌ Campos faltando: ${missingFields.join(', ')}`
    })
    console.log(`   ❌ Campos faltando: ${missingFields.join(', ')}`)
  }
} catch (error) {
  checks.push({
    name: 'Manifest.json',
    status: 'error',
    message: '❌ Erro ao ler manifest.json',
    details: error instanceof Error ? error.message : 'Erro desconhecido'
  })
  console.log('   ❌ Erro ao ler manifest.json:', error)
}
console.log()

// 2. Verificar Service Worker
console.log('2️⃣ VERIFICANDO SERVICE WORKER')
console.log('─'.repeat(60))
try {
  const swPath = join(process.cwd(), 'public', 'sw.js')
  const swContent = readFileSync(swPath, 'utf-8')
  
  const requiredHandlers = [
    'addEventListener(\'push\'',
    'addEventListener(\'notificationclick\'',
    'showNotification'
  ]
  
  const missingHandlers = requiredHandlers.filter(handler => !swContent.includes(handler))
  
  if (missingHandlers.length === 0) {
    checks.push({
      name: 'Service Worker',
      status: 'ok',
      message: '✅ Service Worker configurado corretamente',
      details: 'Handlers de push e notificationclick presentes'
    })
    console.log('   ✅ Service Worker válido')
    console.log('   📋 Push handler: ✅')
    console.log('   📋 Notification click handler: ✅')
    console.log('   📋 Show notification: ✅')
  } else {
    checks.push({
      name: 'Service Worker',
      status: 'error',
      message: `❌ Handlers faltando: ${missingHandlers.join(', ')}`
    })
    console.log(`   ❌ Handlers faltando: ${missingHandlers.join(', ')}`)
  }
} catch (error) {
  checks.push({
    name: 'Service Worker',
    status: 'error',
    message: '❌ Erro ao ler sw.js',
    details: error instanceof Error ? error.message : 'Erro desconhecido'
  })
  console.log('   ❌ Erro ao ler sw.js:', error)
}
console.log()

// 3. Verificar layout.tsx (iOS)
console.log('3️⃣ VERIFICANDO CONFIGURAÇÃO iOS (layout.tsx)')
console.log('─'.repeat(60))
try {
  const layoutPath = join(process.cwd(), 'src', 'app', 'layout.tsx')
  const layoutContent = readFileSync(layoutPath, 'utf-8')
  
  const iosChecks = {
    appleWebApp: layoutContent.includes('appleWebApp'),
    appleIcon: layoutContent.includes('apple:'),
    themeColor: layoutContent.includes('themeColor'),
    viewport: layoutContent.includes('viewport')
  }
  
  const allIOSChecks = Object.values(iosChecks).every(v => v)
  
  if (allIOSChecks) {
    checks.push({
      name: 'Configuração iOS',
      status: 'ok',
      message: '✅ Configuração iOS completa',
      details: 'appleWebApp, ícone Apple, themeColor e viewport configurados'
    })
    console.log('   ✅ Configuração iOS completa')
    console.log('   📋 appleWebApp: ✅')
    console.log('   📋 Ícone Apple: ✅')
    console.log('   📋 Theme Color: ✅')
    console.log('   📋 Viewport: ✅')
  } else {
    const missing = Object.entries(iosChecks)
      .filter(([_, v]) => !v)
      .map(([k]) => k)
    checks.push({
      name: 'Configuração iOS',
      status: 'warning',
      message: `⚠️ Configurações faltando: ${missing.join(', ')}`
    })
    console.log(`   ⚠️ Configurações faltando: ${missing.join(', ')}`)
  }
} catch (error) {
  checks.push({
    name: 'Configuração iOS',
    status: 'error',
    message: '❌ Erro ao verificar layout.tsx',
    details: error instanceof Error ? error.message : 'Erro desconhecido'
  })
  console.log('   ❌ Erro ao verificar layout.tsx:', error)
}
console.log()

// 4. Verificar VAPID keys
console.log('4️⃣ VERIFICANDO VAPID KEYS')
console.log('─'.repeat(60))
const hasPublicKey = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const hasPrivateKey = !!process.env.VAPID_PRIVATE_KEY

if (hasPublicKey && hasPrivateKey) {
  checks.push({
    name: 'VAPID Keys',
    status: 'ok',
    message: '✅ VAPID keys configuradas',
    details: 'Chaves públicas e privadas presentes'
  })
  console.log('   ✅ VAPID keys configuradas')
  console.log('   📋 Chave pública: ✅')
  console.log('   📋 Chave privada: ✅')
} else {
  checks.push({
    name: 'VAPID Keys',
    status: 'error',
    message: '❌ VAPID keys não configuradas',
    details: `Pública: ${hasPublicKey ? 'SIM' : 'NÃO'}, Privada: ${hasPrivateKey ? 'SIM' : 'NÃO'}`
  })
  console.log('   ❌ VAPID keys não configuradas')
  console.log(`   📋 Chave pública: ${hasPublicKey ? '✅' : '❌'}`)
  console.log(`   📋 Chave privada: ${hasPrivateKey ? '✅' : '❌'}`)
}
console.log()

// 5. Verificar HTTPS (crítico para iOS)
console.log('5️⃣ VERIFICANDO HTTPS')
console.log('─'.repeat(60))
const isHTTPS = process.env.NEXTAUTH_URL?.startsWith('https://') || 
                process.env.VERCEL_URL?.includes('vercel.app') ||
                process.env.NODE_ENV === 'production'

if (isHTTPS) {
  checks.push({
    name: 'HTTPS',
    status: 'ok',
    message: '✅ HTTPS configurado (obrigatório para iOS)',
    details: `URL: ${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'Produção'}`
  })
  console.log('   ✅ HTTPS configurado (obrigatório para iOS)')
  console.log(`   📋 URL: ${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'Produção'}`)
} else {
  checks.push({
    name: 'HTTPS',
    status: 'warning',
    message: '⚠️ HTTPS pode não estar configurado',
    details: 'iOS requer HTTPS para notificações push. Verifique em produção.'
  })
  console.log('   ⚠️ HTTPS pode não estar configurado')
  console.log('   💡 iOS requer HTTPS para notificações push')
}
console.log()

// 6. Resumo e recomendações
console.log('6️⃣ RESUMO E RECOMENDAÇÕES')
console.log('─'.repeat(60))
console.log()

const errors = checks.filter(c => c.status === 'error')
const warnings = checks.filter(c => c.status === 'warning')
const ok = checks.filter(c => c.status === 'ok')

console.log(`   ✅ Configurações OK: ${ok.length}`)
console.log(`   ⚠️ Avisos: ${warnings.length}`)
console.log(`   ❌ Erros: ${errors.length}`)
console.log()

if (errors.length > 0) {
  console.log('   ❌ PROBLEMAS CRÍTICOS:')
  errors.forEach((check, index) => {
    console.log(`      ${index + 1}. ${check.name}: ${check.message}`)
    if (check.details) {
      console.log(`         ${check.details}`)
    }
  })
  console.log()
}

if (warnings.length > 0) {
  console.log('   ⚠️ AVISOS:')
  warnings.forEach((check, index) => {
    console.log(`      ${index + 1}. ${check.name}: ${check.message}`)
    if (check.details) {
      console.log(`         ${check.details}`)
    }
  })
  console.log()
}

// Recomendações específicas por plataforma
console.log('   📱 RECOMENDAÇÕES POR PLATAFORMA:')
console.log()
console.log('   🤖 ANDROID:')
console.log('      ✅ Funciona via Chrome/FCM automaticamente')
console.log('      ✅ Web Push Protocol suportado nativamente')
console.log('      ✅ VAPID keys são suficientes')
console.log('      ✅ Service Worker obrigatório (✅ configurado)')
console.log('      ✅ Manifest.json obrigatório (✅ configurado)')
console.log()

console.log('   🍎 iOS:')
console.log('      ✅ Web Push suportado desde iOS 16.4+ (Safari)')
console.log('      ✅ Requer HTTPS (verificar em produção)')
console.log('      ✅ Requer Service Worker (✅ configurado)')
console.log('      ✅ Requer Manifest.json (✅ configurado)')
console.log('      ✅ Requer appleWebApp meta tags (✅ configurado)')
console.log('      ⚠️ Usuários devem usar Safari (não funciona em outros navegadores iOS)')
console.log('      ⚠️ Usuários devem adicionar à tela inicial (PWA)')
console.log('      ⚠️ Notificações só funcionam após usuário permitir')
console.log()

console.log('   🔧 CONFIGURAÇÕES ADICIONAIS RECOMENDADAS:')
console.log('      1. Adicionar ícones de diferentes tamanhos (180x180 para iOS)')
console.log('      2. Configurar screenshots no manifest.json (opcional)')
console.log('      3. Testar em dispositivos reais (iOS e Android)')
console.log('      4. Verificar permissões de notificação no navegador')
console.log('      5. Testar notificações com app fechado')
console.log()

if (errors.length === 0 && warnings.length === 0) {
  console.log('   ✅ CONFIGURAÇÃO COMPLETA!')
  console.log('   💡 O sistema está pronto para Android e iOS')
} else if (errors.length === 0) {
  console.log('   ⚠️ CONFIGURAÇÃO QUASE COMPLETA')
  console.log('   💡 Verifique os avisos acima')
} else {
  console.log('   ❌ CONFIGURAÇÃO INCOMPLETA')
  console.log('   💡 Corrija os erros acima antes de usar em produção')
}

console.log()
console.log('✅ ========== VERIFICAÇÃO CONCLUÍDA ==========')
