// src/scripts/get-phone-numbers-with-notifications.ts
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function getPhoneNumbersWithNotifications() {
  try {
    console.log('📱 BUSCANDO TELEFONES DE USUÁRIOS COM NOTIFICAÇÕES ATIVADAS')
    console.log('='.repeat(60))

    // Buscar usuários com notificações ativadas e telefone cadastrado
    const users = await prisma.user.findMany({
      where: {
        notificationsEnabled: true,
        whatsapp: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 TOTAL DE USUÁRIOS ENCONTRADOS: ${users.length}\n`)

    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado com notificações ativadas e telefone cadastrado.')
      return
    }

    // Exibir resultados no console
    console.log('📋 LISTA DE TELEFONES:\n')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Sem nome'}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   WhatsApp: ${user.whatsapp}`)
      console.log(`   Cadastrado em: ${user.createdAt.toLocaleString('pt-BR')}`)
      console.log('')
    })

    // Criar array apenas com telefones para exportação
    const phoneNumbers = users
      .map(user => ({
        nome: user.name || 'Sem nome',
        email: user.email,
        telefone: user.whatsapp,
        cadastradoEm: user.createdAt.toISOString()
      }))
      .filter(user => user.telefone) // Garantir que tem telefone

    // Exportar para arquivo JSON
    const outputPath = join(process.cwd(), 'telefones-notificacoes-ativadas.json')
    writeFileSync(
      outputPath,
      JSON.stringify(phoneNumbers, null, 2),
      'utf-8'
    )

    console.log(`\n✅ Arquivo exportado: ${outputPath}`)
    console.log(`\n📝 Resumo:`)
    console.log(`   - Total de telefones: ${phoneNumbers.length}`)
    console.log(`   - Arquivo JSON criado com sucesso`)

    // Também criar um arquivo CSV simples
    const csvPath = join(process.cwd(), 'telefones-notificacoes-ativadas.csv')
    const csvHeader = 'Nome,Email,Telefone,Data Cadastro\n'
    const csvRows = phoneNumbers.map(user => 
      `"${user.nome}","${user.email}","${user.telefone}","${user.cadastradoEm}"`
    ).join('\n')
    
    writeFileSync(
      csvPath,
      csvHeader + csvRows,
      'utf-8'
    )

    console.log(`   - Arquivo CSV criado: ${csvPath}`)

  } catch (error) {
    console.error('❌ Erro ao buscar telefones:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  getPhoneNumbersWithNotifications()
    .then(() => {
      console.log('\n✅ Processo concluído!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default getPhoneNumbersWithNotifications
