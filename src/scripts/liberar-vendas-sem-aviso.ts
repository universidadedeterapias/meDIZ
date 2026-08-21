#!/usr/bin/env tsx
/**
 * Libera vendas paradas em `pending_mapping` sem avisar o comprador.
 *
 * Existe para o caso do order bump: o item principal do pedido entregou, criou a
 * conta e mandou o aviso, e so o bump caiu na fila por mapeamento errado. Depois
 * de corrigir o ID, o comprador ja esta dentro ha dias — o que falta e o
 * entitlement, nao uma mensagem nova.
 *
 * Nao serve para quem nunca foi avisado: esses precisam do reprocessamento
 * normal, em /admin/vendas-pendentes.
 *
 * Uso:
 *   npx tsx src/scripts/liberar-vendas-sem-aviso.ts --produto=4690342
 *   npx tsx src/scripts/liberar-vendas-sem-aviso.ts --produto=4690342 --aplicar
 *
 * Sem `--aplicar` o script so mostra o que faria.
 */
import { config } from 'dotenv'

config({ path: '.env' })
config({ path: '.env.local', override: true })

if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'
import {
  deliverFromPurchaseEvent,
  isDeliverFailure
} from '@/lib/purchases/deliver-purchase'

function arg(nome: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return hit ? hit.slice(nome.length + 3) : null
}

const mascarar = (email: string) =>
  email.replace(/^(.{3}).*(@.*)$/, '$1***$2')

async function main() {
  const produto = arg('produto')
  const evento = arg('evento')
  const aplicar = process.argv.includes('--aplicar')

  if (!produto && !evento) {
    console.error('Informe --produto=<idExterno> ou --evento=<uuid>.')
    process.exit(1)
  }

  const eventos = await prisma.purchaseEvent.findMany({
    where: {
      status: 'pending_mapping',
      ...(evento ? { id: evento } : {}),
      ...(produto ? { externalProductId: produto } : {})
    },
    orderBy: { createdAt: 'asc' }
  })

  if (eventos.length === 0) {
    console.log('Nenhuma venda pendente com esse filtro.')
    return
  }

  console.log(
    `${eventos.length} venda(s) pendente(s)${aplicar ? '' : ' — simulacao, nada sera gravado'}\n`
  )

  // Quem ainda nao recebeu nenhum aviso nunca foi apresentado a plataforma:
  // liberar em silencio deixaria a compra invisivel para o comprador.
  const semAvisoPrevio: string[] = []
  for (const ev of eventos) {
    const email = ev.email?.trim().toLowerCase()
    if (!email) continue
    const avisos = await prisma.accessDelivery.count({ where: { email } })
    if (avisos === 0) semAvisoPrevio.push(mascarar(email))
  }

  if (semAvisoPrevio.length > 0) {
    console.error(
      `⛔ ${semAvisoPrevio.length} comprador(es) nunca receberam aviso nenhum:`,
      semAvisoPrevio.join(', ')
    )
    console.error(
      '   Esses precisam do reprocessamento com aviso. Rode com --evento=<uuid> nos demais.'
    )
    process.exit(1)
  }

  let liberados = 0
  let jaTinham = 0
  let falhas = 0

  for (const ev of eventos) {
    const quando = ev.createdAt.toISOString().slice(0, 16)
    const quem = ev.email ? mascarar(ev.email) : '(sem e-mail)'

    if (!aplicar) {
      console.log(`· ${quando} ${quem} — ${ev.externalTransactionId}`)
      continue
    }

    const resultado = await deliverFromPurchaseEvent(ev, {
      notify: false,
      reason: 'Liberado sem aviso (mapeamento corrigido)'
    })

    if (isDeliverFailure(resultado)) {
      falhas++
      console.error(`✗ ${quando} ${quem} — ${resultado.status}: ${resultado.reason}`)
      continue
    }

    const titulos = resultado.productsGranted.map((p) => p.title).join(', ')
    liberados++
    if (resultado.productsGranted.length === 0) jaTinham++
    console.log(`✓ ${quando} ${quem} — ${titulos || 'nada a liberar'}`)
  }

  if (aplicar) {
    console.log(
      `\nConcluido: ${liberados} liberada(s), ${falhas} com falha.` +
        (jaTinham ? ` ${jaTinham} ja tinham tudo.` : '')
    )
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
