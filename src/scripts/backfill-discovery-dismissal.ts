#!/usr/bin/env tsx
/**
 * Reclassifica quem RECUSOU o consentimento da descoberta como "adiado".
 *
 * Ate a migration 20260817140000, recusar gravava `discovery_completed = true` — o
 * mesmo valor de quem realmente fez a descoberta. Na pratica isso era uma porta de
 * mao unica: quem clicou "nao" uma vez, inclusive sem entender, nunca mais recebia
 * o convite.
 *
 * O discriminador e limpo: quem recusou tem `consented_at` nulo e nenhum dado de
 * perfil. Quem concluiu tem `consented_at` preenchido.
 *
 * RODAR DEPOIS DO DEPLOY. Este script zera `discovery_completed` dessas linhas;
 * com o codigo antigo ainda no ar, elas voltariam a cair no redirect da descoberta.
 *
 * Uso:
 *   npm run backfill:discovery-dismissal             (simulacao)
 *   npm run backfill:discovery-dismissal -- --apply  (grava)
 *
 * O `--` do meio nao e enfeite: sem ele o npm engole a flag como opcao dele
 * proprio e o script roda em simulacao achando que vai gravar.
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const APPLY = process.argv.includes('--apply')

async function main() {
  // Recusa: marcada como concluida, mas sem consentimento e sem perfil gerado.
  //
  // `core` e Json?, e ai `{ equals: null }` nao significa o que parece: no Prisma
  // isso procura o valor JSON `null`, nao a coluna NULL. Escrito assim o filtro
  // nao casava com ninguem e o script relatava "nada a fazer" com 1942 linhas
  // esperando. Coluna NULL em campo Json exige `Prisma.DbNull`.
  const where = {
    discoveryCompleted: true,
    consentedAt: null,
    compactProfile: null,
    core: { equals: Prisma.DbNull }
  }

  const alvos = await prisma.userProfile.findMany({
    where,
    select: { id: true, userId: true, updatedAt: true }
  })

  const concluidas = await prisma.userProfile.count({
    where: { discoveryCompleted: true, consentedAt: { not: null } }
  })

  console.log(`perfis com descoberta concluida de verdade: ${concluidas}`)
  console.log(`perfis que apenas recusaram (serao reclassificados): ${alvos.length}`)

  if (alvos.length === 0) {
    console.log('nada a fazer.')
    return
  }

  if (!APPLY) {
    console.log('\nsimulacao — rode com --apply para gravar.')
    return
  }

  // Conta 1 adiamento porque a recusa antiga foi uma recusa de verdade — gastou
  // uma das tres chances. Sobram duas: um convite dispensavel e, depois dele, a
  // descoberta obrigatoria. Quem recusou por engano volta a ver o convite; quem
  // recusou de proposito chega ao passo obrigatorio uma visita antes de quem
  // nunca recusou. Zerar para 0 daria a todos as tres chances cheias.
  const result = await prisma.userProfile.updateMany({
    where,
    data: {
      discoveryCompleted: false,
      discoveryDismissedAt: new Date(),
      discoveryDismissCount: 1
    }
  })

  console.log(`\nreclassificados: ${result.count}`)
}

main()
  .catch((e) => {
    console.error('ERRO:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
