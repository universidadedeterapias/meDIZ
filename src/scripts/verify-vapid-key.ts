/**
 * Script para verificar se a chave VAPID está correta
 * 
 * Uso:
 *   npm run verify-vapid-key
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = base64String.trim().replace(/\s/g, '')
  const padding = '='.repeat((4 - (cleanBase64.length % 4)) % 4)
  const base64 = (cleanBase64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = Buffer.from(base64, 'base64')
  return new Uint8Array(rawData)
}

async function verifyVAPIDKey() {
  console.log('🔍 ========== VERIFICAÇÃO DE CHAVE VAPID ==========\n')

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey) {
    console.error('❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY não encontrada')
    console.log('💡 Execute: npm run generate-vapid-keys')
    process.exit(1)
  }

  if (!privateKey) {
    console.error('❌ VAPID_PRIVATE_KEY não encontrada')
    console.log('💡 Execute: npm run generate-vapid-keys')
    process.exit(1)
  }

  console.log('✅ Chaves encontradas no .env')
  // Não mostrar chaves completas ou parciais por segurança
  console.log(`📋 Chave pública: ${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 4)} (${publicKey.length} chars)`)
  console.log(`📋 Chave privada: ${privateKey.substring(0, 8)}...${privateKey.substring(privateKey.length - 4)} (${privateKey.length} chars)`)
  console.log()

  // Verificar formato da chave pública
  console.log('1️⃣ Verificando formato da chave pública...')
  try {
    const uint8Array = urlBase64ToUint8Array(publicKey)
    console.log(`   ✅ Chave convertida com sucesso`)
    console.log(`   📊 Tamanho: ${uint8Array.length} bytes`)
    
    if (uint8Array.length === 65) {
      console.log('   ✅ Tamanho correto (65 bytes para chave pública VAPID)')
    } else {
      console.warn(`   ⚠️  Tamanho inesperado: esperado 65 bytes, obtido ${uint8Array.length} bytes`)
    }
  } catch (error) {
    console.error('   ❌ Erro ao converter chave:', error)
    console.error('   💡 A chave pode estar em formato incorreto')
    process.exit(1)
  }
  console.log()

  // Verificar se contém apenas caracteres válidos
  console.log('2️⃣ Verificando caracteres válidos...')
  const validChars = /^[A-Za-z0-9_-]+$/
  if (validChars.test(publicKey)) {
    console.log('   ✅ Chave contém apenas caracteres válidos (base64url)')
  } else {
    console.warn('   ⚠️  Chave contém caracteres inválidos')
  }
  console.log()

  // Testar endpoint
  console.log('3️⃣ Testando endpoint /api/push/vapid-public-key...')
  try {
    const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${BASE_URL}/api/push/vapid-public-key`)
    
    if (response.ok) {
      const data = await response.json()
      if (data.publicKey === publicKey) {
        console.log('   ✅ Endpoint retorna a chave correta')
      } else {
        console.warn('   ⚠️  Endpoint retorna chave diferente!')
        // Não mostrar chaves completas
        const expectedMasked = publicKey ? `${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 4)}` : 'N/A'
        const obtainedMasked = data.publicKey ? `${data.publicKey.substring(0, 8)}...${data.publicKey.substring(data.publicKey.length - 4)}` : 'N/A'
        console.warn(`   Esperado: ${expectedMasked}`)
        console.warn(`   Obtido: ${obtainedMasked}`)
      }
    } else {
      console.warn(`   ⚠️  Endpoint retornou status ${response.status}`)
      console.warn('   💡 Certifique-se de que o servidor está rodando (npm run dev)')
    }
  } catch (error) {
    console.warn('   ⚠️  Não foi possível testar o endpoint:', error instanceof Error ? error.message : 'Erro desconhecido')
    console.warn('   💡 Certifique-se de que o servidor está rodando (npm run dev)')
  }
  console.log()

  console.log('✅ ========== VERIFICAÇÃO CONCLUÍDA ==========')
  console.log()
  console.log('💡 Se todas as verificações passaram, a chave está correta.')
  console.log('💡 Se ainda houver erro "push service error", pode ser:')
  console.log('   1. Service Worker não está ativo')
  console.log('   2. Navegador não suporta push notifications')
  console.log('   3. Permissões do navegador bloqueadas')
}

verifyVAPIDKey().catch(console.error)

