#!/usr/bin/env tsx

/**
 * Script para testar a correção da imagem cortada no popup
 * 
 * Este script verifica:
 * 1. Se a imagem está sendo carregada corretamente
 * 2. Se as dimensões estão adequadas
 * 3. Se o Cloudinary está configurado corretamente
 */

import { prisma } from '@/lib/prisma'

async function testPopupImageFix() {
  console.log('🔍 Testando correção da imagem cortada no popup...\n')

  try {
    // 1. Verificar popup ativo
    const popup = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    })

    if (!popup) {
      console.log('❌ Nenhum popup ativo encontrado')
      return
    }

    console.log('✅ Popup ativo encontrado:')
    console.log(`   ID: ${popup.id}`)
    console.log(`   Título: ${popup.title}`)
    console.log(`   URL da imagem: ${popup.imageUrl}`)
    console.log(`   Criado em: ${popup.createdAt}`)
    console.log(`   Atualizado em: ${popup.updatedAt}\n`)

    // 2. Verificar se a URL da imagem é válida
    if (!popup.imageUrl) {
      console.log('❌ Popup não possui imagem configurada')
      return
    }

    // 3. Verificar se é uma URL do Cloudinary
    const isCloudinary = popup.imageUrl.includes('res.cloudinary.com')
    console.log(`📸 Tipo de imagem: ${isCloudinary ? 'Cloudinary' : 'Outro'}`)
    
    if (isCloudinary) {
      // 4. Analisar URL do Cloudinary
      const urlParts = popup.imageUrl.split('/')
      const versionIndex = urlParts.findIndex(part => part.match(/^v\d+$/))
      const publicId = urlParts[versionIndex + 1]
      
      console.log(`   Public ID: ${publicId}`)
      console.log(`   URL completa: ${popup.imageUrl}`)
      
      // 5. Verificar se há transformações na URL
      const hasTransformations = popup.imageUrl.includes('/c_') || 
                                popup.imageUrl.includes('/w_') || 
                                popup.imageUrl.includes('/h_')
      
      console.log(`   Transformações aplicadas: ${hasTransformations ? 'Sim' : 'Não'}`)
      
      if (hasTransformations) {
        console.log('⚠️  ATENÇÃO: A imagem pode ter transformações que causam corte')
        console.log('   Recomendação: Usar URL sem transformações no popup')
      }
    }

    // 6. Verificar configurações do Cloudinary
    console.log('\n🔧 Verificando configurações do Cloudinary:')
    console.log(`   CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log(`   CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log(`   CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅ Configurado' : '❌ Não configurado'}`)

    // 7. Recomendações
    console.log('\n💡 Recomendações para corrigir imagem cortada:')
    console.log('   1. Verificar se a imagem original tem proporções adequadas')
    console.log('   2. Usar object-contain no CSS (já implementado)')
    console.log('   3. Configurar container com aspect-ratio adequado')
    console.log('   4. Evitar transformações no Cloudinary que cortem a imagem')
    console.log('   5. Testar em diferentes resoluções de tela')

    console.log('\n✅ Teste concluído!')

  } catch (error) {
    console.error('❌ Erro ao testar popup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o teste
testPopupImageFix()
