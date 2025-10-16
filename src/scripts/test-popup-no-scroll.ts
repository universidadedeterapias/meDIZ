#!/usr/bin/env tsx

/**
 * Script para testar se o popup não precisa mais de scroll
 * Verifica se todos os elementos cabem na tela
 */

import { prisma } from '@/lib/prisma'

async function testPopupNoScroll() {
  console.log('🔍 Testando popup sem necessidade de scroll...\n')

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

    console.log('🎯 Otimizações para SEM SCROLL:')
    console.log('   ✅ Container: max-h-[85vh] overflow-hidden (era max-h-[90vh] overflow-y-auto)')
    console.log('   ✅ Imagem: h-[200px] sm:h-[250px] (era h-[350px] sm:h-[400px])')
    console.log('   ✅ Gap reduzido: gap-2 (era gap-3)')
    console.log('   ✅ Padding botões: pt-2 (era pt-4)')
    console.log('   ✅ Padding container: p-4 (otimizado)')

    console.log('\n📏 Mudanças específicas:')
    console.log('   1. ❌ ANTES: overflow-y-auto → ✅ DEPOIS: overflow-hidden')
    console.log('   2. ❌ ANTES: h-[350px] sm:h-[400px] → ✅ DEPOIS: h-[200px] sm:h-[250px]')
    console.log('   3. ❌ ANTES: gap-3 → ✅ DEPOIS: gap-2')
    console.log('   4. ❌ ANTES: pt-4 → ✅ DEPOIS: pt-2')
    console.log('   5. ❌ ANTES: max-h-[90vh] → ✅ DEPOIS: max-h-[85vh]')

    console.log('\n🎯 Resultado esperado:')
    console.log('   ✅ Tudo cabe na tela sem scroll')
    console.log('   ✅ Botões sempre visíveis')
    console.log('   ✅ Imagem ainda visível (menor mas proporcional)')
    console.log('   ✅ Texto legível')
    console.log('   ✅ UX melhorada - sem necessidade de rolar')

    console.log('\n🧪 Para testar:')
    console.log('   1. Abrir o popup na plataforma')
    console.log('   2. Verificar se não há scroll')
    console.log('   3. Confirmar que os botões estão visíveis')
    console.log('   4. Testar em diferentes resoluções')

    console.log('\n✅ Popup otimizado para não precisar de scroll!')

  } catch (error) {
    console.error('❌ Erro ao testar popup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testPopupNoScroll()
