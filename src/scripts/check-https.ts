/**
 * Script para verificar se o site está usando HTTPS
 * 
 * Uso:
 *   npx tsx src/scripts/check-https.ts
 */

console.log('🔒 ========== VERIFICAÇÃO DE HTTPS ==========\n')

// 1. Verificar variáveis de ambiente
console.log('1️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE')
console.log('─'.repeat(60))

const nextAuthUrl = process.env.NEXTAUTH_URL
const vercelUrl = process.env.VERCEL_URL
const nodeEnv = process.env.NODE_ENV

console.log(`   📋 NODE_ENV: ${nodeEnv || 'não definido'}`)
console.log(`   📋 NEXTAUTH_URL: ${nextAuthUrl || 'não definido'}`)
console.log(`   📋 VERCEL_URL: ${vercelUrl || 'não definido'}`)
console.log()

// 2. Verificar se URLs são HTTPS
console.log('2️⃣ VERIFICANDO PROTOCOLO DAS URLs')
console.log('─'.repeat(60))

let isHTTPS = false
let httpsDetails: string[] = []

if (nextAuthUrl) {
  if (nextAuthUrl.startsWith('https://')) {
    isHTTPS = true
    httpsDetails.push('✅ NEXTAUTH_URL usa HTTPS')
    console.log('   ✅ NEXTAUTH_URL usa HTTPS')
  } else if (nextAuthUrl.startsWith('http://')) {
    httpsDetails.push('❌ NEXTAUTH_URL usa HTTP (não seguro)')
    console.log('   ❌ NEXTAUTH_URL usa HTTP (não seguro)')
    if (nodeEnv === 'production') {
      console.log('   ⚠️  ATENÇÃO: Em produção, deve usar HTTPS!')
    } else {
      console.log('   ℹ️  Em desenvolvimento, HTTP é normal')
    }
  } else {
    httpsDetails.push('⚠️  NEXTAUTH_URL não tem protocolo definido')
    console.log('   ⚠️  NEXTAUTH_URL não tem protocolo definido')
  }
} else {
  httpsDetails.push('⚠️  NEXTAUTH_URL não está definido')
  console.log('   ⚠️  NEXTAUTH_URL não está definido')
}

if (vercelUrl) {
  if (vercelUrl.includes('vercel.app')) {
    isHTTPS = true
    httpsDetails.push('✅ VERCEL_URL detectado (Vercel fornece HTTPS automaticamente)')
    console.log('   ✅ VERCEL_URL detectado (Vercel fornece HTTPS automaticamente)')
  }
}

if (nodeEnv === 'production') {
  isHTTPS = true
  httpsDetails.push('✅ NODE_ENV=production (assumindo HTTPS)')
  console.log('   ✅ NODE_ENV=production (assumindo HTTPS)')
}

console.log()

// 3. Verificar ambiente
console.log('3️⃣ AMBIENTE DETECTADO')
console.log('─'.repeat(60))

if (nodeEnv === 'production' || vercelUrl) {
  console.log('   🚀 AMBIENTE: Produção')
  console.log('   ✅ HTTPS: Obrigatório e deve estar ativo')
  console.log('   💡 Vercel fornece HTTPS automaticamente para todos os domínios')
} else {
  console.log('   💻 AMBIENTE: Desenvolvimento')
  console.log('   ⚠️  HTTPS: Não obrigatório (HTTP localhost é normal)')
  console.log('   ⚠️  Notificações push iOS NÃO funcionam em desenvolvimento (precisam HTTPS)')
}
console.log()

// 4. Verificar domínio de produção
console.log('4️⃣ DOMÍNIO DE PRODUÇÃO')
console.log('─'.repeat(60))

if (nextAuthUrl) {
  try {
    const url = new URL(nextAuthUrl)
    const hostname = url.hostname
    
    console.log(`   📋 Domínio: ${hostname}`)
    console.log(`   📋 Protocolo: ${url.protocol}`)
    
    if (hostname.includes('mediz.app')) {
      console.log('   ✅ Domínio de produção detectado')
      if (url.protocol === 'https:') {
        console.log('   ✅ HTTPS configurado corretamente')
      } else {
        console.log('   ❌ HTTPS não configurado (deve ser https://)')
      }
    } else if (hostname.includes('localhost')) {
      console.log('   💻 Localhost detectado (desenvolvimento)')
      console.log('   ℹ️  HTTP é normal em desenvolvimento')
    } else {
      console.log('   ⚠️  Domínio desconhecido')
    }
  } catch (error) {
    console.log('   ❌ Erro ao analisar URL:', error)
  }
} else {
  console.log('   ⚠️  NEXTAUTH_URL não definido, não é possível verificar domínio')
}
console.log()

// 5. Recomendações
console.log('5️⃣ RECOMENDAÇÕES')
console.log('─'.repeat(60))

if (nodeEnv === 'production' || vercelUrl) {
  console.log('   ✅ Para verificar HTTPS em produção:')
  console.log('      1. Acesse https://mediz.app no navegador')
  console.log('      2. Verifique se há cadeado 🔒 na barra de endereço')
  console.log('      3. Verifique se a URL começa com https://')
  console.log('      4. Use ferramentas como SSL Labs: https://www.ssllabs.com/ssltest/')
  console.log()
  console.log('   ✅ Vercel fornece HTTPS automaticamente')
  console.log('      Não é necessário configurar certificado SSL manualmente')
} else {
  console.log('   💡 Em desenvolvimento:')
  console.log('      - HTTP localhost é normal')
  console.log('      - Notificações push iOS não funcionam (precisam HTTPS)')
  console.log('      - Para testar push, use ambiente de produção')
  console.log()
  console.log('   💡 Para produção:')
  console.log('      - Configure NEXTAUTH_URL=https://mediz.app')
  console.log('      - Vercel fornece HTTPS automaticamente')
}

console.log()

// 6. Resumo
console.log('6️⃣ RESUMO')
console.log('─'.repeat(60))

if (isHTTPS || nodeEnv === 'production' || vercelUrl) {
  console.log('   ✅ HTTPS: Configurado ou assumido (produção)')
  console.log('   💡 Verifique visualmente no navegador acessando o site')
} else {
  console.log('   ⚠️  HTTPS: Não detectado (pode ser desenvolvimento)')
  console.log('   💡 Em desenvolvimento, HTTP é normal')
  console.log('   ⚠️  Notificações push iOS requerem HTTPS')
}

console.log()
console.log('✅ ========== VERIFICAÇÃO CONCLUÍDA ==========')
console.log()
console.log('💡 DICA: A forma mais simples de verificar é:')
console.log('   1. Abra o site no navegador')
console.log('   2. Olhe para a barra de endereço')
console.log('   3. Se tiver cadeado 🔒 e https:// = HTTPS ✅')
console.log('   4. Se não tiver cadeado ou tiver http:// = HTTP ❌')
