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
 *   npx tsx src/scripts/aplicar-migration.ts --migration=<pasta> --url=MIGRATION_URL --aplicar
 *
 * Sem `--aplicar` o script so mostra o que faria.
 */
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

config({ path: '.env' })
config({ path: '.env.local', override: true })

/**
 * Conexao com permissao de DDL.
 *
 * `DATABASE_URL` aponta para o Accelerate, que responde como
 * `prisma_application` — papel sem permissao de criar no schema. O `DIRECT_URL`
 * e a conexao TCP com o `prisma_migration`, dono das tabelas, e e por ele que
 * toda migration precisa passar.
 *
 * O `--url=<ENV>` existe para o caso de a conexao certa estar em outra env.
 */
const envDaUrl = process.argv
  .find((a) => a.startsWith('--url='))
  ?.slice('--url='.length)

if (envDaUrl) {
  const url = process.env[envDaUrl]?.trim()
  if (!url) {
    console.error(`A env ${envDaUrl} nao esta definida.`)
    process.exit(1)
  }
  process.env.DATABASE_URL = url
} else if (process.env.DATABASE_URL?.startsWith('prisma+') && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

import { PrismaClient } from '@prisma/client'

/**
 * Cliente proprio, e nao o singleton de `@/lib/prisma`.
 *
 * O `import` do singleton e icado para o topo do modulo pelo ESM: ele nasceria
 * com a `DATABASE_URL` que estivesse valendo ANTES da troca abaixo — a do
 * Accelerate, que responde como `prisma_application` e nao cria tabela. O erro
 * disso e enganoso ("permission denied for schema public", como se a credencial
 * estivesse errada) quando o que esta errado e a conexao escolhida.
 *
 * Passar a URL na construcao e o que garante que a migration sai pela conexao
 * decidida aqui, e nao pela que o modulo capturou primeiro.
 */
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
})

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
