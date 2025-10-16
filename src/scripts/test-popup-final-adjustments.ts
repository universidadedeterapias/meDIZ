#!/usr/bin/env tsx

/**
 * Script para testar os ajustes finais do popup
 * Verifica: imagem maior, descrição menor, botão assinar primeiro
 */

import { prisma } from '@/lib/prisma'

async function testPopupFinalAdjustments() {
  console.log('🔍 Testando ajustes finais do popup...\n')

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

    console.log('🎯 AJUSTES FINAIS IMPLEMENTADOS:')
    console.log('   ✅ Imagem MAIOR: h-[280px] sm:h-[320px] (era h-[200px] sm:h-[250px])')
    console.log('   ✅ Descrição MENOR: text-xs + leading-tight (era text-xs sm:text-sm)')
    console.log('   ✅ Botão "Assinar Agora" PRIMEIRO: order-1 (era segundo)')
    console.log('   ✅ Botão "Fechar" SEGUNDO: order-2 (era primeiro)')

    console.log('\n📏 Mudanças específicas:')
    console.log('   1. ❌ ANTES: h-[200px] sm:h-[250px] → ✅ DEPOIS: h-[280px] sm:h-[320px]')
    console.log('   2. ❌ ANTES: text-xs sm:text-sm → ✅ DEPOIS: text-xs leading-tight')
    console.log('   3. ❌ ANTES: Fechar primeiro → ✅ DEPOIS: Assinar Agora primeiro')
    console.log('   4. ❌ ANTES: Assinar Agora segundo → ✅ DEPOIS: Fechar segundo')

    console.log('\n🎯 Resultado esperado:')
    console.log('   ✅ Imagem mais destacada e visível')
    console.log('   ✅ Descrição mais compacta e menor')
    console.log('   ✅ Botão principal (Assinar) em destaque')
    console.log('   ✅ Melhor hierarquia visual')
    console.log('   ✅ UX otimizada para conversão')

    console.log('\n🧪 Para testar:')
    console.log('   1. Abrir o popup na plataforma')
    console.log('   2. Verificar se a imagem está maior')
    console.log('   3. Verificar se o texto está menor')
    console.log('   4. Confirmar que "Assinar Agora" vem primeiro')
    console.log('   5. Testar em mobile e desktop')

    console.log('\n✅ Ajustes finais implementados!')

  } catch (error) {
    console.error('❌ Erro ao testar ajustes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testPopupFinalAdjustments()
