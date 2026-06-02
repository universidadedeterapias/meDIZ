// src/scripts/fix-nextauth-url.ts
/**
 * Script para verificar e corrigir NEXTAUTH_URL
 * 
 * Execução: npx ts-node -r tsconfig-paths/register src/scripts/fix-nextauth-url.ts
 */

import fs from 'fs'
import path from 'path'

async function fixNextAuthUrl() {
  console.log('🔧 Verificando e corrigindo NEXTAUTH_URL...')
  
  const envPath = path.join(process.cwd(), '.env.local')
  
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(envPath)) {
      console.error('❌ Arquivo .env.local não encontrado')
      return
    }
    
    // Ler o arquivo
    const envContent = fs.readFileSync(envPath, 'utf8')
    console.log('✅ Arquivo .env.local encontrado')
    
    // Verificar NEXTAUTH_URL atual
    const urlMatch = envContent.match(/NEXTAUTH_URL="?([^"\n]+)"?/)
    if (urlMatch) {
      const currentUrl = urlMatch[1]
      console.log(`📋 NEXTAUTH_URL atual: "${currentUrl}"`)
      
      // Verificar se é uma URL válida
      try {
        new URL(currentUrl)
        console.log('✅ URL é válida')
        
        // Verificar se é localhost
        if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
          console.log('✅ URL aponta para localhost')
        } else {
          console.log('⚠️ URL não aponta para localhost')
        }
        
      } catch {
        console.error('❌ URL inválida:', currentUrl)
        console.log('🔧 Corrigindo automaticamente...')
        
        // Corrigir a URL
        const correctedContent = envContent.replace(
          /NEXTAUTH_URL="?[^"\n]+"?/,
          'NEXTAUTH_URL="http://localhost:3000"'
        )
        
        // Salvar arquivo corrigido
        fs.writeFileSync(envPath, correctedContent)
        console.log('✅ Arquivo .env.local corrigido')
        console.log('📋 Nova NEXTAUTH_URL: "http://localhost:3000"')
      }
    } else {
      console.log('⚠️ NEXTAUTH_URL não encontrada no arquivo')
      console.log('🔧 Adicionando NEXTAUTH_URL...')
      
      // Adicionar NEXTAUTH_URL
      const newContent = envContent + '\nNEXTAUTH_URL="http://localhost:3000"\n'
      fs.writeFileSync(envPath, newContent)
      console.log('✅ NEXTAUTH_URL adicionada')
    }
    
    // Verificar outras variáveis importantes
    console.log('\n📋 Verificando outras variáveis:')
    
    const requiredVars = [
      'NEXTAUTH_SECRET',
      'DATABASE_URL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ]
    
    requiredVars.forEach(varName => {
      const match = envContent.match(new RegExp(`${varName}="?([^"\n]+)"?`))
      if (match) {
        console.log(`✅ ${varName}: Configurado`)
      } else {
        console.log(`❌ ${varName}: Não configurado`)
      }
    })
    
    console.log('\n✅ Verificação concluída!')
    console.log('🚀 Reinicie o servidor com: npm run dev')
    
  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error)
  }
}

// Executar correção
fixNextAuthUrl()
  .catch((error) => {
    console.error('❌ Erro inesperado:', error)
  })
  .finally(() => {
    process.exit(0)
  })
