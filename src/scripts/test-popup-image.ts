// Script para testar se a imagem do popup está sendo cortada
// Executa: npm run test-popup-image

import { prisma } from '../lib/prisma'

async function testPopupImage() {
  console.log('🔍 Testando configuração da imagem do popup...')
  
  try {
    // Busca a configuração atual do popup
    const popupConfig = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' }
    })

    if (!popupConfig) {
      console.log('❌ Nenhum popup ativo encontrado')
      return
    }

    console.log('📋 Configuração do popup ativo:')
    console.log(`   ID: ${popupConfig.id}`)
    console.log(`   Título: ${popupConfig.title}`)
    console.log(`   Status: ${popupConfig.status}`)
    console.log(`   Imagem URL: ${popupConfig.imageUrl || 'Nenhuma'}`)
    console.log(`   Criado em: ${popupConfig.createdAt}`)
    console.log(`   Atualizado em: ${popupConfig.updatedAt}`)

    if (popupConfig.imageUrl) {
      console.log('\n🖼️ Testando acesso à imagem:')
      console.log(`   URL: ${popupConfig.imageUrl}`)
      
      // Testa se a URL é acessível
      try {
        const response = await fetch(popupConfig.imageUrl, { method: 'HEAD' })
        if (response.ok) {
          console.log('   ✅ Imagem acessível')
          console.log(`   📏 Tamanho: ${response.headers.get('content-length')} bytes`)
          console.log(`   🎨 Tipo: ${response.headers.get('content-type')}`)
        } else {
          console.log(`   ❌ Erro ao acessar imagem: ${response.status}`)
        }
      } catch (error) {
        console.log(`   ❌ Erro de rede: ${error}`)
      }
    }

    console.log('\n📝 Conteúdo do popup:')
    console.log(popupConfig.content)

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executa o teste
testPopupImage()
  .then(() => {
    console.log('\n🎉 Teste concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })
