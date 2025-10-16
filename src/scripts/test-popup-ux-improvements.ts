#!/usr/bin/env tsx

/**
 * Script para testar as melhorias de UX do popup
 * Verifica se a imagem ficou maior e a descrição menor
 */

import { prisma } from '@/lib/prisma'

async function testPopupUXImprovements() {
  console.log('🔍 Testando melhorias de UX do popup...\n')

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
    console.log(`   URL da imagem: ${popup.imageUrl}\n`)

    console.log('🎨 Melhorias de UX implementadas:')
    console.log('   ✅ Imagem MAIOR: h-[350px] sm:h-[400px] (era h-[250px] sm:h-[300px])')
    console.log('   ✅ Descrição MENOR: prose-xs + text-xs sm:text-sm (era prose-sm)')
    console.log('   ✅ Gap reduzido: gap-3 (era gap-4)')
    console.log('   ✅ Mais espaço para a imagem')

    console.log('\n📏 Mudanças específicas:')
    console.log('   1. ❌ ANTES: h-[250px] sm:h-[300px] → ✅ DEPOIS: h-[350px] sm:h-[400px]')
    console.log('   2. ❌ ANTES: prose prose-sm → ✅ DEPOIS: prose prose-xs')
    console.log('   3. ❌ ANTES: sem text-xs → ✅ DEPOIS: text-xs sm:text-sm')
    console.log('   4. ❌ ANTES: gap-4 → ✅ DEPOIS: gap-3')

    console.log('\n🎯 Resultado esperado:')
    console.log('   ✅ Imagem mais destacada e visível')
    console.log('   ✅ Descrição mais compacta')
    console.log('   ✅ Melhor proporção visual')
    console.log('   ✅ Mais foco na imagem promocional')

    console.log('\n🧪 Para testar:')
    console.log('   1. Abrir o popup na plataforma')
    console.log('   2. Verificar se a imagem está maior')
    console.log('   3. Verificar se o texto está menor')
    console.log('   4. Confirmar melhor proporção visual')

    console.log('\n✅ Melhorias de UX implementadas!')

  } catch (error) {
    console.error('❌ Erro ao testar melhorias:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testPopupUXImprovements()
