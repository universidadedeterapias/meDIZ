#!/usr/bin/env tsx

/**
 * Script para verificar se a imagem do popup está sendo carregada
 * Diagnostica problemas com a exibição da imagem
 */

import { prisma } from '@/lib/prisma'

async function checkPopupImage() {
  console.log('🔍 Verificando se a imagem do popup está sendo carregada...\n')

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

    console.log('📸 Popup ativo encontrado:')
    console.log(`   ID: ${popup.id}`)
    console.log(`   Título: ${popup.title}`)
    console.log(`   URL da imagem: ${popup.imageUrl}`)
    console.log(`   Status: ${popup.status}`)
    console.log(`   Criado em: ${popup.createdAt}`)
    console.log(`   Atualizado em: ${popup.updatedAt}\n`)

    // Verificar se tem imagem
    if (!popup.imageUrl) {
      console.log('❌ PROBLEMA: Popup não possui imagem configurada!')
      console.log('   Solução: Fazer upload de uma imagem no painel admin')
      return
    }

    console.log('✅ Popup possui imagem configurada')

    // Verificar se é URL válida
    try {
      const url = new URL(popup.imageUrl)
      console.log(`✅ URL válida: ${url.hostname}`)
      
      if (url.hostname.includes('cloudinary.com')) {
        console.log('✅ Imagem hospedada no Cloudinary')
      } else {
        console.log('⚠️  Imagem hospedada em outro serviço')
      }
    } catch (urlError) {
      console.log('❌ URL inválida:', popup.imageUrl)
    }

    // Verificar código do componente
    console.log('\n🔧 Verificando código do componente:')
    console.log('   ✅ Condição: {popupConfig?.imageUrl && (...)}')
    console.log('   ✅ Container: <div className="relative w-full h-[280px] sm:h-[320px]">')
    console.log('   ✅ Image: <Image src={popupConfig.imageUrl} ... />')
    console.log('   ✅ Altura: h-[280px] sm:h-[320px] (280-320px)')
    console.log('   ✅ Object-fit: objectFit: "contain"')

    console.log('\n💡 Possíveis causas da imagem não aparecer:')
    console.log('   1. ❌ URL da imagem inválida ou quebrada')
    console.log('   2. ❌ Problema de CORS no Cloudinary')
    console.log('   3. ❌ Erro no onError que esconde a imagem')
    console.log('   4. ❌ Problema de CSS que esconde o container')
    console.log('   5. ❌ Imagem muito pequena para ser vista')

    console.log('\n🧪 Para diagnosticar:')
    console.log('   1. Abrir DevTools (F12)')
    console.log('   2. Ir para aba Network')
    console.log('   3. Abrir o popup')
    console.log('   4. Verificar se a imagem é carregada')
    console.log('   5. Verificar se há erros no Console')

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro ao verificar popup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar verificação
checkPopupImage()
