/**
 * Uma entrega em andamento pela Loggi, para ver a pagina /rastreio com dados.
 *
 * provider = 'demo' para nao se confundir com venda de verdade e para a limpeza
 * ser uma linha.
 *
 * Uso: npx tsx _demo-loggi.ts
 *      npx tsx _demo-loggi.ts --limpar
 */
import { prisma } from '@/lib/prisma'
import { buildTrackingUrl, detectCarrier } from '@/lib/shipping/carriers'

const EMAIL = 'paulobarbosashows@gmail.com'
const TX = 'demo-loggi-em-transito'

// Codigo inventado, no formato da Loggi (LG + 21 digitos). Nao usei um codigo
// real da planilha de proposito: ele abriria o rastreio de uma compradora de
// verdade, com o endereco dela na tela.
const CODIGO = 'LG101787900000000000001'

async function main() {
  const limpar = process.argv.includes('--limpar')

  const usuario = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true, name: true }
  })
  if (!usuario) {
    console.log(`Usuario ${EMAIL} nao encontrado.`)
    return
  }

  if (limpar) {
    const { count } = await prisma.bookShipment.deleteMany({
      where: { provider: 'demo', userId: usuario.id }
    })
    console.log(`${count} despacho(s) de demonstracao removido(s).`)
    return
  }

  const postadoEm = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  const criadoEm = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const carrier = detectCarrier(CODIGO)

  const dados = {
    userId: usuario.id,
    email: usuario.email,
    nome: usuario.name ?? null,
    provider: 'demo',
    externalTransactionId: TX,
    status: 'em_transito',
    trackingCode: CODIGO,
    carrier: carrier.id,
    trackingUrl: buildTrackingUrl(CODIGO),
    lastStatusLabel: 'Em trânsito para a unidade de distribuição de São Paulo',
    postedAt: postadoEm,
    deliveredAt: null,
    deliveryConfirmedAt: null,
    lastCheckedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    createdAt: criadoEm
  }

  const row = await prisma.bookShipment.upsert({
    where: {
      provider_externalTransactionId: { provider: 'demo', externalTransactionId: TX }
    },
    create: dados,
    update: dados
  })

  console.log(`conta:          ${usuario.email}`)
  console.log(`status:         ${row.status}`)
  console.log(`codigo:         ${row.trackingCode}`)
  console.log(`transportadora: ${carrier.label} (id ${row.carrier})`)
  console.log(`link:           ${buildTrackingUrl(CODIGO)}`)
  console.log(`postado em:     ${postadoEm.toLocaleDateString('pt-BR')}`)
  console.log(`\nEntre como ${EMAIL} e abra /rastreio.`)
  console.log('Para remover: npx tsx _demo-loggi.ts --limpar')
}

main()
  .catch((error) => {
    console.error('Falhou:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
