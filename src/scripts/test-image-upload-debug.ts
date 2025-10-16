#!/usr/bin/env tsx

/**
 * Script para testar o upload de imagem e verificar logs de debug
 * Simula o processo de upload para identificar problemas
 */

import { prisma } from '@/lib/prisma'

async function testImageUploadDebug() {
  console.log('🔍 Testando upload de imagem com logs de debug...\n')

  try {
    // Verificar popup atual
    const popup = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    })

    if (!popup) {
      console.log('❌ Nenhum popup ativo encontrado')
      return
    }

    console.log('📸 Popup atual:')
    console.log(`   Título: ${popup.title}`)
    console.log(`   URL da imagem: ${popup.imageUrl}`)
    console.log(`   Criado em: ${popup.createdAt}`)
    console.log(`   Atualizado em: ${popup.updatedAt}\n`)

    // Analisar URL do Cloudinary
    if (popup.imageUrl && popup.imageUrl.includes('res.cloudinary.com')) {
      console.log('☁️  Análise da URL do Cloudinary:')
      
      // Extrair informações da URL
      const url = new URL(popup.imageUrl)
      const pathParts = url.pathname.split('/')
      
      console.log(`   Domínio: ${url.hostname}`)
      console.log(`   Caminho: ${url.pathname}`)
      
      // Verificar se há transformações na URL
      const hasTransformations = url.pathname.includes('/c_') || 
                                url.pathname.includes('/w_') || 
                                url.pathname.includes('/h_') ||
                                url.pathname.includes('/f_') ||
                                url.pathname.includes('/q_')
      
      console.log(`   Transformações na URL: ${hasTransformations ? 'Sim' : 'Não'}`)
      
      if (hasTransformations) {
        console.log('   ⚠️  ATENÇÃO: URL contém transformações que podem estar cortando a imagem')
        console.log('   Recomendação: Usar URL sem transformações')
      } else {
        console.log('   ✅ URL sem transformações - imagem original')
      }
    }

    // Verificar configurações do Cloudinary
    console.log('\n🔧 Configurações atuais do upload:')
    console.log('   ❌ quality: "auto" - Pode estar comprimindo e cortando')
    console.log('   ❌ fetch_format: "auto" - Pode estar convertendo formato')
    console.log('   ❌ flags: "progressive" - Pode estar causando processamento adicional')
    console.log('   ✅ folder: "popup_images" - OK')
    console.log('   ✅ overwrite: false - OK')
    console.log('   ✅ resource_type: "image" - OK')

    console.log('\n💡 Problemas identificados:')
    console.log('   1. quality: "auto" pode estar comprimindo a imagem')
    console.log('   2. fetch_format: "auto" pode estar convertendo para formato que corta')
    console.log('   3. flags: "progressive" pode estar causando processamento adicional')
    console.log('   4. Falta de configuração para preservar dimensões originais')

    console.log('\n🔧 Solução recomendada:')
    console.log('   1. Remover quality: "auto"')
    console.log('   2. Remover fetch_format: "auto"')
    console.log('   3. Remover flags: "progressive"')
    console.log('   4. Adicionar configurações para preservar dimensões')
    console.log('   5. Usar URL sem transformações no popup')

    console.log('\n✅ Análise concluída!')

  } catch (error) {
    console.error('❌ Erro ao testar upload:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testImageUploadDebug()
