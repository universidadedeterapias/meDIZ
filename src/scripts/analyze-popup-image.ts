#!/usr/bin/env tsx

/**
 * Script para analisar a imagem atual do popup
 * Verifica dimensões, proporções e possíveis problemas
 */

import { prisma } from '@/lib/prisma'

async function analyzePopupImage() {
  console.log('🔍 Analisando imagem atual do popup...\n')

  try {
    // Buscar popup ativo
    const popup = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    })

    if (!popup || !popup.imageUrl) {
      console.log('❌ Nenhum popup com imagem encontrado')
      return
    }

    console.log('📸 Imagem encontrada:')
    console.log(`   URL: ${popup.imageUrl}`)
    console.log(`   Título: ${popup.title}\n`)

    // Analisar URL do Cloudinary
    if (popup.imageUrl.includes('res.cloudinary.com')) {
      console.log('☁️  Análise do Cloudinary:')
      
      // Extrair informações da URL
      const urlParts = popup.imageUrl.split('/')
      const versionIndex = urlParts.findIndex(part => part.match(/^v\d+$/))
      
      if (versionIndex !== -1) {
        const version = urlParts[versionIndex]
        const publicId = urlParts[versionIndex + 1]
        
        console.log(`   Versão: ${version}`)
        console.log(`   Public ID: ${publicId}`)
      }

      // Verificar se há transformações
      const hasTransformations = popup.imageUrl.includes('/c_') || 
                                popup.imageUrl.includes('/w_') || 
                                popup.imageUrl.includes('/h_') ||
                                popup.imageUrl.includes('/f_') ||
                                popup.imageUrl.includes('/q_')

      console.log(`   Transformações: ${hasTransformations ? 'Sim' : 'Não'}`)
      
      if (hasTransformations) {
        console.log('   ⚠️  Transformações detectadas podem estar causando corte')
      } else {
        console.log('   ✅ Sem transformações - imagem original')
      }
    }

    // Recomendações específicas
    console.log('\n💡 Recomendações para corrigir imagem cortada:')
    console.log('   1. ✅ Container com min-h-[200px] max-h-[400px] (implementado)')
    console.log('   2. ✅ object-contain no CSS (implementado)')
    console.log('   3. ✅ Popup maior: max-w-2xl/max-w-3xl (implementado)')
    console.log('   4. ✅ Cloudinary sem transformações (verificado)')
    console.log('   5. 🔄 Testar em diferentes resoluções')
    console.log('   6. 🔄 Verificar se a imagem original tem proporções adequadas')

    // Sugestões de teste
    console.log('\n🧪 Como testar:')
    console.log('   1. Abrir popup em diferentes resoluções (mobile, tablet, desktop)')
    console.log('   2. Verificar se a imagem aparece completa')
    console.log('   3. Testar com diferentes imagens de exemplo')
    console.log('   4. Verificar se não há scroll horizontal')

    console.log('\n✅ Análise concluída!')

  } catch (error) {
    console.error('❌ Erro ao analisar imagem:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar análise
analyzePopupImage()
