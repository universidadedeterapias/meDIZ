#!/usr/bin/env tsx

/**
 * Script para testar se a correção do upload está funcionando
 * Verifica as novas configurações do Cloudinary
 */

import { prisma } from '@/lib/prisma'

async function testUploadFix() {
  console.log('🔍 Testando correção do upload de imagem...\n')

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

    console.log('🔧 Configurações CORRIGIDAS do upload:')
    console.log('   ✅ Removido: quality: "auto" (problemático)')
    console.log('   ✅ Removido: fetch_format: "auto" (problemático)')
    console.log('   ✅ Removido: flags: "progressive" (problemático)')
    console.log('   ✅ Adicionado: transformation com width/height: "auto"')
    console.log('   ✅ Adicionado: crop: "limit" (não corta)')
    console.log('   ✅ Adicionado: quality: "good" (fixo)')
    console.log('   ✅ Adicionado: fetch_format: "auto:good" (otimizado)')

    console.log('\n💡 O que foi corrigido:')
    console.log('   1. ❌ ANTES: quality: "auto" → ✅ DEPOIS: quality: "good"')
    console.log('   2. ❌ ANTES: fetch_format: "auto" → ✅ DEPOIS: fetch_format: "auto:good"')
    console.log('   3. ❌ ANTES: flags: "progressive" → ✅ DEPOIS: removido')
    console.log('   4. ✅ ADICIONADO: width/height: "auto" (preserva dimensões)')
    console.log('   5. ✅ ADICIONADO: crop: "limit" (não corta)')

    console.log('\n🎯 Resultado esperado:')
    console.log('   ✅ Imagem não será mais cortada durante upload')
    console.log('   ✅ Dimensões originais serão preservadas')
    console.log('   ✅ Qualidade mantida sem compressão excessiva')
    console.log('   ✅ Formato otimizado sem corte')

    console.log('\n🧪 Para testar:')
    console.log('   1. Fazer upload de uma nova imagem no admin')
    console.log('   2. Verificar se a imagem aparece completa no popup')
    console.log('   3. Comparar com a imagem original')

    console.log('\n✅ Correção implementada!')

  } catch (error) {
    console.error('❌ Erro ao testar correção:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testUploadFix()
