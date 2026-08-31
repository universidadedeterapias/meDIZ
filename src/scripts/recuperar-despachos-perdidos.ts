#!/usr/bin/env tsx
/**
 * Cria os despachos de venda de livro impresso que ficaram sem linha.
 *
 * Sao duas populacoes, e elas chegaram aqui por caminhos diferentes:
 *
 * 1. Order bump com comprador novo. Tres produtos no mesmo checkout viram tres
 *    webhooks simultaneos; dois estouravam no unique de `email` ao criar a conta,
 *    e a venda caia como `failed`. Quem perdia a corrida ficava sem entitlement e
 *    sem despacho. O `grantPurchaseAccess` ja trata isso, mas o conserto nao
 *    reprocessa o que ja passou.
 *
 * 2. Livro impresso vendido pelo Guru. O ID da oferta so existia numa env vazia,
 *    entao a venda nao era reconhecida como impressa: nao virava despacho, e de
 *    quebra caia na regra do digital. Os IDs agora sao fixos no codigo.
 *
 * O que cada uma precisa e diferente, e o script decide pelo status da venda:
 *
 * - `processed` -> so o despacho. O comprador ja tem o que comprou;
 *   reprocessar inteiro mexeria no que esta certo.
 * - qualquer outro (`failed`, `pending_mapping`, `received`) ->
 *   reprocessamento inteiro. Venda que nao chegou a ser processada nao esta so sem
 *   despacho: esta sem entitlement, e o comprador nao tem acesso a nada. Criar so
 *   a linha do despacho deixaria de pe justamente o problema maior.
 *
 * Nao manda mensagem nova. Nao por opcao deste script: a regra de uma mensagem
 * por pessoa e do `deliverAccess`, e quem ja foi avisado registra a segunda como
 * `skipped`. O relatorio mostra quem esta nessa situacao antes de aplicar.
 *
 * O que este script NAO alcanca: venda que nunca chegou em `purchase_events`.
 * Sem o registro da compra nao ha o que reprocessar — esses precisam ser criados
 * a mao a partir da planilha da grafica.
 *
 * Uso:
 *   npx tsx src/scripts/recuperar-despachos-perdidos.ts
 *   npx tsx src/scripts/recuperar-despachos-perdidos.ts --aplicar
 *   npx tsx src/scripts/recuperar-despachos-perdidos.ts --evento=<uuid> --aplicar
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
import { normalizeLibraryEmail } from '@/lib/library/email'
import { STONE_PHYSICAL_BOOK_IDS } from '@/lib/purchases/book-purchase'
import { HOTMART_PHYSICAL_BOOK_IDS } from '@/lib/purchases/hotmart-grant-rules'
import {
  deliverFromPurchaseEvent,
  isDeliverFailure
} from '@/lib/purchases/deliver-purchase'
import { ensureBookShipment } from '@/lib/shipping/book-shipment'

function arg(nome: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return hit ? hit.slice(nome.length + 3) : null
}

const mascarar = (email: string | null) =>
  (email ?? '(sem e-mail)').replace(/^(.{3}).*(@.*)$/, '$1***$2')

async function main() {
  const evento = arg('evento')
  const aplicar = process.argv.includes('--aplicar')

  const produtos = [...HOTMART_PHYSICAL_BOOK_IDS, ...STONE_PHYSICAL_BOOK_IDS]
  console.log(`IDs de livro impresso conhecidos: ${produtos.join(', ')}\n`)

  const eventos = await prisma.purchaseEvent.findMany({
    where: {
      externalProductId: { in: produtos },
      ...(evento ? { id: evento } : {})
    },
    orderBy: { createdAt: 'asc' }
  })

  // O despacho e unico por (provider, transacao) — e a mesma chave que o
  // `ensureBookShipment` usa para nao criar dois. Cruzar em memoria evita uma
  // consulta por venda, e sao dezenas de linhas.
  const despachos = await prisma.bookShipment.findMany({
    select: { provider: true, externalTransactionId: true }
  })
  const jaTemDespacho = new Set(
    despachos.map((d) => `${d.provider}:${d.externalTransactionId}`)
  )

  const orfaos = eventos.filter(
    (e) => !jaTemDespacho.has(`${e.provider}:${e.externalTransactionId}`)
  )

  if (orfaos.length === 0) {
    console.log(
      `${eventos.length} venda(s) de impresso, todas com despacho. Nada a recuperar.`
    )
    return
  }

  console.log(
    `${eventos.length} venda(s) de impresso · ${orfaos.length} sem despacho` +
      `${aplicar ? '' : ' — simulacao, nada sera gravado'}\n`
  )

  let criados = 0
  let reprocessados = 0
  let falhas = 0

  for (const ev of orfaos) {
    const quando = ev.createdAt.toISOString().slice(0, 10)
    const quem = mascarar(ev.email)
    // Nao e "falhou ou nao": e "foi processada ou nao". `pending_mapping` e
    // `received` tambem sao vendas sem acesso liberado, e tratar as duas como
    // "so falta o despacho" esconderia um comprador sem nada.
    const completo = ev.status !== 'processed'
    const acao = completo ? 'reprocessa a venda' : 'cria so o despacho'

    // Quem ja tem `access_message_at` nao recebe mensagem nova — a trava e do
    // `deliverAccess`, e nao deste script. Mostrar antes evita a pergunta.
    const email = ev.email ? normalizeLibraryEmail(ev.email) : null
    const usuario = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, accessMessageAt: true }
        })
      : null

    const aviso = !usuario
      ? 'sem conta'
      : usuario.accessMessageAt
        ? 'ja avisado'
        : 'PODE RECEBER AVISO'

    const linha =
      `${quando}  ${ev.provider.padEnd(7)} ${String(ev.externalProductId).slice(0, 12).padEnd(12)} ` +
      `${quem.padEnd(28)} status=${ev.status.padEnd(9)} ${acao.padEnd(19)} [${aviso}]`

    if (!aplicar) {
      console.log(`· ${linha}`)
      continue
    }

    try {
      if (completo) {
        const resultado = await deliverFromPurchaseEvent(ev, {
          reason: 'Recuperado: venda de impresso ficou sem despacho'
        })
        if (isDeliverFailure(resultado)) {
          falhas++
          console.error(`✗ ${linha}\n    ${resultado.status}: ${resultado.reason}`)
          continue
        }
        reprocessados++
        console.log(`✓ ${linha}`)
      } else {
        const shipment = await ensureBookShipment({
          purchaseEventId: ev.id,
          userId: usuario?.id ?? null,
          email: email ?? '',
          nome: ev.nome,
          telefone: ev.telefone,
          provider: ev.provider,
          externalTransactionId: ev.externalTransactionId,
          externalProductId: ev.externalProductId
        })
        if (!shipment) {
          falhas++
          console.error(`✗ ${linha}\n    despacho nao foi criado`)
          continue
        }
        criados++
        console.log(`✓ ${linha}`)
      }
    } catch (error) {
      falhas++
      console.error(
        `✗ ${linha}\n    ${error instanceof Error ? error.message : 'falha desconhecida'}`
      )
    }
  }

  if (!aplicar) {
    console.log(
      `\nSimulacao. Rode com --aplicar para gravar.` +
        `\nQuem aparece como PODE RECEBER AVISO vai receber a mensagem de acesso.`
    )
    return
  }

  console.log(
    `\nConcluido: ${criados} despacho(s) criado(s), ` +
      `${reprocessados} venda(s) reprocessada(s), ${falhas} com falha.`
  )

  if (criados + reprocessados > 0) {
    console.log(
      'O codigo de rastreio chega pelo job do n8n, na proxima leitura da planilha.'
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
