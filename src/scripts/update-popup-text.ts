// src/scripts/update-popup-text.ts
import { prisma } from '@/lib/prisma'

async function updatePopupText() {
  console.log('🔄 Atualizando texto do popup...')

  try {
    // Busca a configuração atual do popup
    const currentPopup = await prisma.popupConfig.findFirst({
      where: { status: 'ACTIVE' }
    })

    if (!currentPopup) {
      console.log('❌ Nenhum popup ativo encontrado')
      return
    }

    console.log('📝 Texto atual:', currentPopup.content)

    // Atualiza o texto para "Clique para saber mais."
    const updatedPopup = await prisma.popupConfig.update({
      where: { id: currentPopup.id },
      data: {
        content: currentPopup.content.replace(
          /clique e saiba mais/gi,
          'Clique para saber mais.'
        )
      }
    })

    console.log('✅ Popup atualizado com sucesso!')
    console.log('📝 Novo texto:', updatedPopup.content)

  } catch (error) {
    console.error('❌ Erro ao atualizar popup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updatePopupText()
}

export { updatePopupText }
