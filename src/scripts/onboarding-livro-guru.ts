#!/usr/bin/env tsx
/**
 * Da o onboarding do livro a quem comprou pelo Guru antes de ele existir la.
 *
 * O caminho Stone liberava acesso e criava despacho, mas nao concedia os 7 dias
 * de Profissional nem inscrevia na esteira pos-compra — comprador do mesmo livro
 * recebia tratamento diferente conforme a porta por onde entrou. O conserto ja
 * esta no codigo, mas ele so vale para venda nova.
 *
 * Este script fecha a diferenca para quem ficou atras.
 *
 * O par trial + esteira sai junto, do mesmo `startBookOnboarding` que o webhook
 * usa, e nao de duas chamadas soltas: os e-mails 4 e 5 anunciam o fim dos 7 dias,
 * entao os dois relogios precisam partir do mesmo instante. Aqui esse instante e
 * agora, e nao a data da compra — quem comprou ha duas semanas nao ganharia nada
 * com um trial que ja nasceu vencido.
 *
 * Nao manda mensagem. O `startBookOnboarding` nao fala com o cliente; quem fala e
 * o `deliverAccess`, que nao e chamado aqui.
 *
 * Seguro repetir: `grantProfessionalTrial` e idempotente pelo unique de
 * `trial_<origem>_<transacao>`, e a esteira nao abre uma segunda inscricao para
 * quem ja tem uma ativa. Quem ja assina o Profissional nao ganha trial nenhum —
 * seria trocar uma assinatura melhor por uma de 7 dias.
 *
 * Uso:
 *   npx tsx src/scripts/onboarding-livro-guru.ts
 *   npx tsx src/scripts/onboarding-livro-guru.ts --aplicar
 *   npx tsx src/scripts/onboarding-livro-guru.ts --so-impresso --aplicar
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
import {
  isBookPurchase,
  isPhysicalBookProduct
} from '@/lib/purchases/book-purchase'
import { resolveBuyerLanguage } from '@/lib/purchases/enroll-email-sequence'
import { startBookOnboarding } from '@/lib/purchases/start-book-onboarding'

const mascarar = (email: string | null) =>
  (email ?? '(sem e-mail)').replace(/^(.{3}).*(@.*)$/, '$1***$2')

async function main() {
  const aplicar = process.argv.includes('--aplicar')
  const soImpresso = process.argv.includes('--so-impresso')

  const eventos = await prisma.purchaseEvent.findMany({
    where: { provider: 'stone', status: 'processed' },
    orderBy: { createdAt: 'asc' }
  })

  const livros: typeof eventos = []
  for (const ev of eventos) {
    const ehLivro = await isBookPurchase({
      provider: 'stone',
      externalProductId: ev.externalProductId,
      catalogProductId: ev.catalogProductId
    })
    if (!ehLivro) continue
    if (soImpresso && !isPhysicalBookProduct('stone', ev.externalProductId)) {
      continue
    }
    livros.push(ev)
  }

  if (livros.length === 0) {
    console.log('Nenhuma compra de livro pelo Guru encontrada.')
    return
  }

  console.log(
    `${livros.length} compra(s) de livro pelo Guru` +
      `${soImpresso ? ' (só impresso)' : ''}` +
      `${aplicar ? '' : ' — simulacao, nada sera gravado'}\n`
  )

  let concedidos = 0
  let jaTinham = 0
  let semConta = 0

  for (const ev of livros) {
    const quando = ev.createdAt.toISOString().slice(0, 10)
    const quem = mascarar(ev.email)
    const impresso = isPhysicalBookProduct('stone', ev.externalProductId)
    const tipo = impresso ? 'impresso' : 'digital '

    const email = ev.email ? normalizeLibraryEmail(ev.email) : null
    const usuario = email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null

    if (!usuario) {
      semConta++
      console.log(`· ${quando} ${tipo} ${quem.padEnd(28)} SEM CONTA — nada a fazer`)
      continue
    }

    // Moeda e pais so foram gravados depois desta mudanca, entao a venda antiga
    // chega com os dois nulos e cai no pt-BR. Mostrar o idioma resolvido deixa
    // isso visivel antes de aplicar, em vez de virar surpresa na caixa de entrada.
    const lang = resolveBuyerLanguage({
      currency: ev.currency,
      country: ev.country
    })

    const trial = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: `trial_stone_${ev.externalTransactionId}`
      },
      select: { id: true }
    })
    const esteira = await prisma.emailSequenceEnrollment.findFirst({
      where: { userId: usuario.id },
      select: { id: true, status: true }
    })

    const falta = [!trial && 'trial', !esteira && 'esteira'].filter(Boolean)

    if (falta.length === 0) {
      jaTinham++
      console.log(
        `· ${quando} ${tipo} ${quem.padEnd(28)} ja tem trial e esteira`
      )
      continue
    }

    if (!aplicar) {
      console.log(
        `· ${quando} ${tipo} ${quem.padEnd(28)} falta ${falta.join(' + ')} · idioma ${lang}`
      )
      continue
    }

    const resultado = await startBookOnboarding({
      userId: usuario.id,
      email,
      name: ev.nome,
      source: 'stone',
      externalTransactionId: ev.externalTransactionId,
      currency: ev.currency,
      country: ev.country
    })

    const trialTxt = resultado.trial.granted
      ? 'trial ok'
      : `trial ${resultado.trial.reason ?? 'falhou'}`
    const esteiraTxt = resultado.enrollment.enrolled
      ? `esteira ${resultado.enrollment.lang}`
      : `esteira ${resultado.enrollment.reason ?? 'falhou'}`

    concedidos++
    console.log(
      `✓ ${quando} ${tipo} ${quem.padEnd(28)} ${trialTxt} · ${esteiraTxt}`
    )
  }

  if (!aplicar) {
    console.log('\nSimulacao. Rode com --aplicar para gravar.')
    return
  }

  console.log(
    `\nConcluido: ${concedidos} onboarding(s) concedido(s), ` +
      `${jaTinham} ja tinham, ${semConta} sem conta.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
