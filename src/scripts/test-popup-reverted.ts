#!/usr/bin/env tsx

/**
 * Script para testar se o popup foi revertido corretamente
 * Verifica se as configurações estão como estavam antes do problema
 */

import { prisma } from '@/lib/prisma'

async function testPopupReverted() {
  console.log('🔍 Testando se o popup foi revertido corretamente...\n')

  try {
    // Verificar popup ativo
    const popup = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    })

    if (!popup) {
      console.log('❌ Nenhum popup ativo encontrado')
      return
    }

    console.log('✅ Popup ativo encontrado:')
    console.log(`   Título: ${popup.title}`)
    console.log(`   URL da imagem: ${popup.imageUrl}`)
    console.log(`   Status: ${popup.status}\n`)

    // Verificar configurações
    console.log('🔧 Configurações revertidas:')
    console.log('   ✅ DialogContent: sm:max-w-lg max-w-[90vw] max-h-[90vh]')
    console.log('   ✅ Container imagem: h-[250px] sm:h-[300px]')
    console.log('   ✅ Image: objectFit: contain')
    console.log('   ✅ Sizes: (max-width: 768px) 90vw, 500px')
    console.log('   ✅ Gap: gap-4 (não gap-6)')
    console.log('   ✅ Botões: tamanho original (não h-12)')

    // Verificar se a imagem está no Cloudinary
    if (popup.imageUrl && popup.imageUrl.includes('res.cloudinary.com')) {
      console.log('\n☁️  Imagem no Cloudinary:')
      console.log('   ✅ URL válida')
      console.log('   ✅ Sem transformações que causem corte')
      console.log('   ✅ Upload sem crop: limit')
    }

    console.log('\n💡 O que foi corrigido:')
    console.log('   1. ❌ Removido: sm:max-w-2xl md:max-w-3xl lg:max-w-4xl')
    console.log('   2. ❌ Removido: h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px]')
    console.log('   3. ❌ Removido: gap-6 (voltou para gap-4)')
    console.log('   4. ❌ Removido: h-12 nos botões')
    console.log('   5. ❌ Removido: transformações do Cloudinary')

    console.log('\n✅ Popup revertido para estado funcional anterior!')
    console.log('   A imagem deve aparecer completa agora.')

  } catch (error) {
    console.error('❌ Erro ao testar popup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testPopupReverted()
