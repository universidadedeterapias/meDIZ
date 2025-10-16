#!/usr/bin/env tsx

import { prisma } from '@/lib/prisma'

async function quickCheck() {
  try {
    const popup = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    })

    if (!popup) {
      console.log('❌ Nenhum popup ativo')
      return
    }

    console.log('📸 Popup encontrado:')
    console.log(`   Título: ${popup.title}`)
    console.log(`   Tem imagem: ${popup.imageUrl ? 'SIM' : 'NÃO'}`)
    console.log(`   URL: ${popup.imageUrl || 'N/A'}`)

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

quickCheck()
