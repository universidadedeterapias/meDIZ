/**
 * Cria os despachos que a tabela nunca chegou a registrar.
 *
 * `book_shipments` nasceu em 19/08. A venda do livro impresso e mais velha que
 * ela, entao toda compra aprovada antes disso ficou sem linha — e sem linha nao
 * ha o que o rastreio atualizar: a pessoa comprou, a grafica despachou, e o
 * meDIZ nao sabe que existe um livro a caminho.
 *
 * A fonte e o proprio `purchase_events`, que guarda a venda inteira desde o
 * primeiro webhook. Nada aqui e reconstruido a mao.
 *
 * Nao avisa ninguem, de proposito: essas pessoas ja receberam o aviso de acesso
 * na epoca da compra, e um segundo aviso agora so confundiria. O que falta e o
 * rastreio, e o rastreio chega pelo job do n8n depois que a linha existir.
 *
 * Venda com `status = 'failed'` fica de fora: ela nao virou acesso, entao criar
 * um despacho mostraria "seu livro esta sendo preparado" para quem nem consegue
 * entrar. Elas sao listadas no fim para alguem olhar.
 *
 * Uso: npx tsx src/scripts/backfill-book-shipments.ts --dry-run
 *      npx tsx src/scripts/backfill-book-shipments.ts
 */
import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { HOTMART_PHYSICAL_BOOK_IDS } from '@/lib/purchases/hotmart-grant-rules'
import { ensureBookShipment } from '@/lib/shipping/book-shipment'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const prefixo = dryRun ? '[DRY-RUN] ' : ''

  const produtos = [...HOTMART_PHYSICAL_BOOK_IDS]

  const eventos = await prisma.purchaseEvent.findMany({
    where: { externalProductId: { in: produtos } },
    orderBy: { createdAt: 'asc' }
  })

  // `purchase_event_id` e coluna solta, sem relacao no schema — o cruzamento sai
  // em memoria mesmo. Sao dezenas de linhas, nao vale indireta.
  const despachos = await prisma.bookShipment.findMany({
    select: { purchaseEventId: true, provider: true, externalTransactionId: true }
  })
  const jaTemEvento = new Set(
    despachos.map((d) => d.purchaseEventId).filter((id): id is string => !!id)
  )
  const jaTemTransacao = new Set(
    despachos.map((d) => `${d.provider}:${d.externalTransactionId}`)
  )

  const faltando = eventos.filter(
    (e) =>
      !jaTemEvento.has(e.id) &&
      !jaTemTransacao.has(`${e.provider}:${e.externalTransactionId}`)
  )
  const semAcesso = faltando.filter((e) => e.status === 'failed')
  const paraCriar = faltando.filter((e) => e.status !== 'failed')

  console.log(
    `${prefixo}Produto(s) impresso(s): ${produtos.join(', ')}\n` +
      `${eventos.length} venda(s) registrada(s), ${despachos.length} despacho(s) na tabela.\n` +
      `${paraCriar.length} sem despacho a criar, ${semAcesso.length} ignorada(s) por venda falha.\n`
  )

  let criados = 0
  let semUsuario = 0
  const falhas: string[] = []

  for (const evento of paraCriar) {
    if (!evento.email) {
      falhas.push(`${evento.externalTransactionId}: evento sem e-mail`)
      continue
    }

    const email = normalizeLibraryEmail(evento.email)

    // O evento guarda o e-mail da compra, nao o id do usuario. O despacho vive
    // sem `userId` (o webhook tambem cria assim quando a conta ainda nao existe),
    // mas com ele o casamento por CPF do rastreio funciona.
    const usuario = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })
    if (!usuario) semUsuario++

    const dia = evento.createdAt.toISOString().slice(0, 10)
    const marca = usuario ? '→' : '⚠'
    console.log(
      `${marca} ${dia}  ${evento.externalTransactionId}  ${email}` +
        (usuario ? '' : '  (sem conta no meDIZ)')
    )

    if (dryRun) continue

    const criado = await ensureBookShipment({
      purchaseEventId: evento.id,
      userId: usuario?.id ?? null,
      email,
      nome: evento.nome,
      telefone: evento.telefone,
      provider: evento.provider,
      externalTransactionId: evento.externalTransactionId,
      externalProductId: evento.externalProductId
    })

    // `ensureBookShipment` engole o erro e devolve null: a venda nunca pode cair
    // por causa do despacho. Aqui o silencio nao serve — e o unico trabalho.
    if (criado) criados++
    else falhas.push(`${evento.externalTransactionId}: ensureBookShipment falhou`)
  }

  console.log(
    `\n${prefixo}${dryRun ? paraCriar.length : criados} despacho(s) ` +
      `${dryRun ? 'seriam criados' : 'criados'}.` +
      (semUsuario ? ` ${semUsuario} sem conta no meDIZ.` : '')
  )

  if (falhas.length) {
    console.log(`\n${falhas.length} falha(s):`)
    for (const f of falhas) console.log(`  ✗ ${f}`)
  }

  if (semAcesso.length) {
    console.log(
      `\n${semAcesso.length} venda(s) com status "failed" — compraram o livro e ` +
        `nao receberam acesso. Precisam ser reprocessadas antes de qualquer ` +
        `despacho:`
    )
    for (const e of semAcesso) {
      console.log(
        `  ! ${e.createdAt.toISOString().slice(0, 10)}  ` +
          `${e.externalTransactionId}  ${e.email ?? 'sem e-mail'}  ` +
          `${e.reason ?? 'sem motivo registrado'}`
      )
    }
  }
}

main()
  .catch((error) => {
    console.error('Falha no backfill:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
