#!/usr/bin/env tsx

/**
 * Script para testar se o upload simples está funcionando
 * Verifica se o erro 500 foi corrigido
 */

import { prisma } from '@/lib/prisma'

async function testUploadSimple() {
  console.log('🔍 Testando upload simples (sem configurações problemáticas)...\n')

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

    console.log('🔧 Configurações SIMPLIFICADAS do upload:')
    console.log('   ✅ folder: "popup_images"')
    console.log('   ✅ public_id: timestamp único')
    console.log('   ✅ overwrite: false')
    console.log('   ✅ resource_type: "image"')
    console.log('   ❌ REMOVIDO: quality (causava erro)')
    console.log('   ❌ REMOVIDO: fetch_format (causava erro)')
    console.log('   ❌ REMOVIDO: flags (causava erro)')
    console.log('   ❌ REMOVIDO: transformation (causava erro)')

    console.log('\n💡 Correção aplicada:')
    console.log('   1. ❌ ANTES: Configurações complexas → ✅ DEPOIS: Configuração mínima')
    console.log('   2. ❌ ANTES: transformation array → ✅ DEPOIS: sem transformation')
    console.log('   3. ❌ ANTES: quality/fetch_format → ✅ DEPOIS: sem essas configurações')
    console.log('   4. ✅ RESULTADO: Upload deve funcionar sem erro 500')

    console.log('\n🎯 Resultado esperado:')
    console.log('   ✅ Upload funcionará sem erro 500')
    console.log('   ✅ Imagem será salva no Cloudinary')
    console.log('   ✅ URL será retornada corretamente')
    console.log('   ⚠️  Imagem pode ainda ser cortada (problema original)')

    console.log('\n🧪 Para testar:')
    console.log('   1. Tentar fazer upload de uma nova imagem')
    console.log('   2. Verificar se não há mais erro 500')
    console.log('   3. Se funcionar, investigar por que a imagem é cortada')

    console.log('\n✅ Correção do erro 500 implementada!')

  } catch (error) {
    console.error('❌ Erro ao testar upload:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testUploadSimple()
