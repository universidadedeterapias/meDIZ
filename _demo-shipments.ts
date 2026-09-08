/**
 * Cria despachos de demonstracao para o usuario de desenvolvimento, um por
 * estado, so para ver o card da biblioteca em todas as cores de uma vez.
 *
 * provider = 'demo' de proposito: e o que torna a limpeza trivial e o que
 * impede alguem de confundir isto com venda de verdade.
 *
 * Uso: npx tsx _demo-shipments.ts
 *      npx tsx _demo-shipments.ts --limpar
 */
import { prisma } from '@/lib/prisma'
import { buildTrackingUrl, detectCarrier } from '@/lib/shipping/carriers'

const EMAIL = 'develop.admin@mediz.com'

const CENARIOS = [
  {
    tx: 'demo-1-aguardando',
    status: 'aguardando_postagem',
    codigo: null as string | null,
    label: null as string | null,
    dias: 3
  },
  {
    tx: 'demo-2-postado',
    status: 'postado',
    codigo: 'AD616582319BR',
    label: 'Objeto postado',
    dias: 6
  },
  {
    tx: 'demo-3-transito',
    status: 'em_transito',
    codigo: 'LG101787569629914292225',
    label: 'Em trânsito para a unidade de distribuição',
    dias: 9
  },
  {
    tx: 'demo-4-entregue',
    status: 'entregue',
    codigo: 'AN843345178BR',
    label: 'Objeto entregue ao destinatário',
    dias: 14
  },
  {
    tx: 'demo-5-problema',
    status: 'problema',
    codigo: 'AD666699567BR',
    label: 'Destinatário ausente — segunda tentativa amanhã',
    dias: 11
  }
]

async function main() {
  const limpar = process.argv.includes('--limpar')

  const usuario = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true }
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

  for (const c of CENARIOS) {
    const criadoEm = new Date(Date.now() - c.dias * 24 * 60 * 60 * 1000)
    const carrier = c.codigo ? detectCarrier(c.codigo) : null

    const dados = {
      userId: usuario.id,
      email: usuario.email,
      nome: 'Develop Root User',
      provider: 'demo',
      externalTransactionId: c.tx,
      status: c.status,
      trackingCode: c.codigo,
      carrier: carrier?.id ?? null,
      trackingUrl: c.codigo ? buildTrackingUrl(c.codigo) : null,
      lastStatusLabel: c.label,
      postedAt: c.status === 'aguardando_postagem' ? null : criadoEm,
      deliveredAt: c.status === 'entregue' ? new Date() : null,
      createdAt: criadoEm
    }

    const row = await prisma.bookShipment.upsert({
      where: {
        provider_externalTransactionId: {
          provider: 'demo',
          externalTransactionId: c.tx
        }
      },
      create: dados,
      update: dados
    })

    console.log(
      `${c.status.padEnd(20)} ${(c.codigo ?? '—').padEnd(24)} ` +
        `transportadora: ${row.carrier ?? '—'}  link: ${row.trackingUrl ? 'sim' : 'nao'}`
    )
  }

  console.log(`\nPronto. Entre como ${EMAIL} e abra /biblioteca.`)
  console.log('Para remover: npx tsx _demo-shipments.ts --limpar')
}

main()
  .catch((error) => {
    console.error('Falhou:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
