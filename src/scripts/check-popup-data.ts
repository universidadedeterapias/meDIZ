// src/scripts/check-popup-data.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 VERIFICANDO DADOS DO POPUP\n')

  try {
    const popups = await prisma.popupConfig.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    })

    console.log(`📊 Total de popups encontrados: ${popups.length}\n`)

    if (popups.length === 0) {
      console.log('❌ Nenhum popup encontrado no banco de dados')
      console.log('💡 Vou criar um popup de exemplo...')
      
      const examplePopup = await prisma.popupConfig.create({
        data: {
          title: 'Oferta Especial de Lançamento',
          content: `# 🎉 Oferta Especial!

**Desconto de 50% nos primeiros 3 meses** para novos assinantes.

## ✨ O que você ganha:
- Acesso completo a todas as análises
- Sem limitações de pesquisas
- Conteúdo premium exclusivo
- Suporte prioritário

**Clique abaixo e saiba mais.**

*Oferta válida por tempo limitado!*`,
          imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
          subscribeLink: 'https://go.hotmart.com/N101121884P',
          status: 'ACTIVE'
        }
      })
      
      console.log('✅ Popup de exemplo criado!')
      console.log(`📝 ID: ${examplePopup.id}`)
      console.log(`📝 Título: ${examplePopup.title}`)
      console.log(`📝 Status: ${examplePopup.status}`)
    } else {
      popups.forEach((popup, index) => {
        console.log(`\n${index + 1}. POPUP ID: ${popup.id}`)
        console.log(`   📝 Título: ${popup.title}`)
        console.log(`   📄 Conteúdo: ${popup.content.substring(0, 100)}...`)
        console.log(`   🖼️  Imagem: ${popup.imageUrl || 'Não definida'}`)
        console.log(`   🔗 Link: ${popup.subscribeLink}`)
        console.log(`   📊 Status: ${popup.status}`)
        console.log(`   📅 Criado: ${popup.createdAt.toLocaleDateString('pt-BR')}`)
        console.log(`   🔄 Atualizado: ${popup.updatedAt.toLocaleDateString('pt-BR')}`)
      })
    }

  } catch (error) {
    console.error('❌ Erro ao verificar popups:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
