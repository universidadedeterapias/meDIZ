// src/scripts/seed-popup-data.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Criando dados de exemplo para popups...')

  try {
    // Verifica se já existem popups
    const existingPopups = await prisma.popupConfig.count()
    
    if (existingPopups > 0) {
      console.log(`Já existem ${existingPopups} popups no banco. Pulando criação.`)
      return
    }

    // Cria popups de exemplo
    const popups = await prisma.popupConfig.createMany({
      data: [
        {
          title: 'Oferta Especial de Lançamento',
          content: 'Aproveite nossa oferta especial de lançamento! Desconto de 50% nos primeiros 3 meses para novos assinantes.',
          imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
          subscribeLink: 'https://go.hotmart.com/N101121884P',
          status: 'ACTIVE'
        },
        {
          title: 'Desbloqueie Conteúdo Completo',
          content: 'Você está vendo apenas uma prévia do conteúdo. Assine agora para ter acesso completo a todas as análises e insights médicos.',
          imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
          subscribeLink: 'https://go.hotmart.com/N101121884P',
          status: 'INACTIVE'
        },
        {
          title: 'Transforme Sua Prática Médica',
          content: 'Junte-se a milhares de profissionais que já transformaram sua prática com nossos insights baseados em IA.',
          imageUrl: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=300&fit=crop',
          subscribeLink: 'https://go.hotmart.com/N101121884P',
          status: 'ACTIVE'
        }
      ]
    })

    console.log(`Criados ${popups.count} popups de exemplo com sucesso!`)
  } catch (error) {
    console.error('Erro ao criar dados de exemplo:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
