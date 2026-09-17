#!/usr/bin/env tsx
/**
 * Recupera User.whatsapp para quem foi criado direto pela compra antes do fix
 * em grant-purchase.ts (branch fix/whatsapp-nao-persistido-na-compra).
 *
 * Ate esse fix, grantPurchaseAccess nunca gravava telefone — so email/nome/cpf.
 * O telefone continua existindo no payload bruto de purchase_events, porque quem
 * usava ele (aviso de acesso, despacho) lia direto do payload, nunca da conta. Este
 * script casa por e-mail com o evento de compra mais recente e reaproveita os
 * MESMOS parsers que o codigo ja usa em producao — getBuyerPhone (Hotmart) e
 * parseStoneWebhook (Stone) — para nao inventar uma segunda forma de ler o mesmo
 * payload.
 *
 * Escopo deliberadamente restrito a hotmart/stone: e a mesma populacao que o fix
 * em codigo cobre daqui pra frente. purchase_events de importacao_planilha ficam
 * de fora de proposito — o telefone la vem de coluna propria (linha.whatsapp), nao
 * do payload, e a qualidade/formato e outra decisao.
 *
 * So preenche quem esta com whatsapp NULL — nunca sobrescreve numero existente,
 * nem o de quem corrigiu depois de comprar.
 *
 * Uso:
 *   npm run backfill:whatsapp-from-purchase-events             (simulacao)
 *   npm run backfill:whatsapp-from-purchase-events -- --apply  (grava)
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'
import { getBuyerPhone } from '@/lib/hotmart/buyer'
import { parseStoneWebhook } from '@/lib/stone/parse-webhook'
import type { HotmartPayload } from '@/types/hotmart'

const APPLY = process.argv.includes('--apply')

function resolveTelefone(
  provider: string,
  payload: unknown
): string | null {
  try {
    if (provider === 'hotmart') {
      return getBuyerPhone(payload as HotmartPayload)
    }
    if (provider === 'stone') {
      const parsed = parseStoneWebhook(payload as Record<string, unknown>)
      return parsed?.telefone ?? null
    }
  } catch {
    // Payload torto de venda antiga — pula, nao derruba o backfill inteiro.
    return null
  }
  return null
}

async function main() {
  const candidatos = await prisma.user.findMany({
    where: { whatsapp: null },
    select: { id: true, email: true }
  })
  console.log(`Contas com whatsapp NULL: ${candidatos.length}`)

  let semEvento = 0
  let naoDeuPraExtrair = 0
  let recuperados = 0
  const porProvider: Record<string, number> = { hotmart: 0, stone: 0 }
  const exemplosFalha: string[] = []

  for (const user of candidatos) {
    const evento = await prisma.purchaseEvent.findFirst({
      where: {
        email: { equals: user.email, mode: 'insensitive' },
        provider: { in: ['hotmart', 'stone'] },
        status: 'processed'
      },
      orderBy: { createdAt: 'desc' },
      select: { provider: true, payload: true }
    })

    if (!evento) {
      semEvento++
      continue
    }

    const telefone = resolveTelefone(evento.provider, evento.payload)
    if (!telefone) {
      naoDeuPraExtrair++
      if (exemplosFalha.length < 10) exemplosFalha.push(user.email)
      continue
    }

    recuperados++
    porProvider[evento.provider] = (porProvider[evento.provider] ?? 0) + 1

    if (APPLY) {
      // `whatsapp: null` no where e o mesmo cuidado do fix em codigo: nunca
      // sobrescreve numero que já exista, nem o de quem corrigiu no intervalo
      // entre a consulta e a escrita.
      await prisma.user.updateMany({
        where: { id: user.id, whatsapp: null },
        data: { whatsapp: telefone }
      })
    }
  }

  console.log(`Sem nenhum purchase_event hotmart/stone: ${semEvento}`)
  console.log(`Tinha evento mas nao deu pra extrair telefone: ${naoDeuPraExtrair}`)
  if (exemplosFalha.length) {
    console.log(`  exemplos: ${exemplosFalha.join(', ')}`)
  }
  console.log(`Recuperados: ${recuperados} (${JSON.stringify(porProvider)})`)

  if (!APPLY) {
    console.log('\nsimulacao — rode com --apply para gravar.')
  } else {
    console.log('\ngravado.')
  }
}

main()
  .catch((e) => {
    console.error('ERRO:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
