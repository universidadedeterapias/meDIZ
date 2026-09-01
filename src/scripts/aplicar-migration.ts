#!/usr/bin/env tsx
/**
 * Aplica UMA migration no banco, e so ela.
 *
 * Existe porque `prisma migrate deploy` nao serve aqui: o historico de migrations
 * divergiu do banco em algum momento, e o deploy tentaria aplicar tudo que ele
 * julga faltando — inclusive coisas que ja existem por outro caminho, e inclusive
 * `DROP`s de tabelas que estao em uso. Nao existe ambiente de staging para
 * descobrir isso depois.
 *
 * Aqui o alvo e explicito, os comandos sao mostrados antes, e tudo roda numa
 * transacao: ou a migration inteira entra, ou nada entra.
 *
 * Depois de aplicar, registre no historico para o Prisma parar de considera-la
 * pendente:
 *   npx prisma migrate resolve --applied <pasta>
 *
 * Uso:
 *   npx tsx src/scripts/aplicar-migration.ts --migration=20260901120000_eventos_de_jornada
 *   npx tsx src/scripts/aplicar-migration.ts --migration=<pasta> --aplicar
 *
 * Sem `--aplicar` o script so mostra o que faria.
 */
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

config({ path: '.env' })
config({ path: '.env.local', override: true })

// O Accelerate nao aceita DDL. Migration precisa da conexao direta.
if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { prisma } from '@/lib/prisma'

function arg(nome: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${nome}=`))
  return hit ? hit.slice(nome.length + 3) : null
}

/**
 * Um comando por vez: o driver recusa varios comandos numa unica chamada, e o
 * corte por `;` no fim da linha e suficiente porque as migrations deste repo nao
 * usam bloco `DO $$`. Se alguma passar a usar, este corte quebra o bloco no meio
 * e o erro aparece na hora — nao em silencio.
 */
function separaComandos(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !/^(--[^\n]*\n?)+$/.test(c))
}

async function main() {
  const pasta = arg('migration')
  const aplicar = process.argv.includes('--aplicar')

  if (!pasta) {
    console.error('Informe --migration=<pasta>')
    process.exit(1)
  }

  const caminho = join('prisma', 'migrations', pasta, 'migration.sql')
  if (!existsSync(caminho)) {
    console.error(`Nao achei ${caminho}`)
    process.exit(1)
  }

  const comandos = separaComandos(readFileSync(caminho, 'utf8'))
  console.log(
    `${pasta}: ${comandos.length} comando(s)` +
      `${aplicar ? '' : ' — simulacao, nada sera gravado'}\n`
  )

  for (const [i, comando] of comandos.entries()) {
    const primeiraLinha = comando
      .split('\n')
      .find((l) => l.trim() && !l.trim().startsWith('--'))
    console.log(`${i + 1}. ${primeiraLinha?.trim().slice(0, 100)}`)
  }

  if (!aplicar) {
    console.log('\nSimulacao. Rode com --aplicar para gravar.')
    return
  }

  console.log('\nAplicando numa transacao...')
  await prisma.$transaction(comandos.map((c) => prisma.$executeRawUnsafe(c)))
  console.log('Aplicada.')
  console.log(`\nRegistre no historico:\n  npx prisma migrate resolve --applied ${pasta}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
