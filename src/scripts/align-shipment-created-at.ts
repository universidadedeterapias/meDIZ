/**
 * Devolve ao despacho a data da compra.
 *
 * O backfill criou as linhas que faltavam com `created_at` de hoje — o schema
 * carimba `now()` e `ensureBookShipment` nao tem por onde passar outra data. So
 * que quem comprou em 18/08 espera desde 18/08, e e essa espera que o painel do
 * admin mede: `parados_ha_dias` conta quem esta em `aguardando_postagem` ha mais
 * de 15 dias, e com a data de hoje o alarme nunca tocaria para essas pessoas.
 *
 * A data certa vem do `purchase_event` que originou o despacho.
 *
 * So mexe em linha que ainda espera codigo: despacho ja postado tem historico
 * proprio, e reescrever a data dele apagaria a ordem dos fatos.
 *
 * Uso: npx tsx src/scripts/align-shipment-created-at.ts --dry-run
 *      npx tsx src/scripts/align-shipment-created-at.ts
 */
import { prisma } from '@/lib/prisma'

type Defasada = {
  id: string
  externalTransactionId: string
  email: string
  criadoEm: Date
  compraEm: Date
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const prefixo = dryRun ? '[DRY-RUN] ' : ''

  const defasadas = await prisma.$queryRaw<Defasada[]>`
    SELECT s.id                       AS "id",
           s.external_transaction_id  AS "externalTransactionId",
           s.email                    AS "email",
           s.created_at               AS "criadoEm",
           pe.created_at              AS "compraEm"
      FROM book_shipments s
      JOIN purchase_events pe ON pe.id = s.purchase_event_id
     WHERE s.status = 'aguardando_postagem'
       AND s.tracking_code IS NULL
       AND s.created_at::date <> pe.created_at::date
     ORDER BY pe.created_at ASC
  `

  console.log(
    `${prefixo}${defasadas.length} despacho(s) com data de criacao diferente da compra.\n`
  )

  for (const linha of defasadas) {
    console.log(
      `→ ${linha.externalTransactionId}  ${linha.email}  ` +
        `${linha.criadoEm.toISOString().slice(0, 10)} → ` +
        `${linha.compraEm.toISOString().slice(0, 10)}`
    )
  }

  if (dryRun || defasadas.length === 0) {
    console.log(`\n${prefixo}Nada gravado.`)
    return
  }

  // Uma sentenca so: sao dezenas de linhas e o valor novo sai do proprio join,
  // entao ler-e-escrever uma a uma seria ida e volta a toa.
  const atualizadas = await prisma.$executeRaw`
    UPDATE book_shipments s
       SET created_at = pe.created_at,
           updated_at = now()
      FROM purchase_events pe
     WHERE pe.id = s.purchase_event_id
       AND s.status = 'aguardando_postagem'
       AND s.tracking_code IS NULL
       AND s.created_at::date <> pe.created_at::date
  `

  const parados = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM book_shipments
     WHERE status = 'aguardando_postagem'
       AND created_at < now() - interval '15 days'
  `

  console.log(
    `\n${atualizadas} despacho(s) atualizado(s).\n` +
      `Parados ha mais de 15 dias, pela metrica do admin: ${parados[0]?.n ?? 0}.`
  )
}

main()
  .catch((error) => {
    console.error('Falha ao alinhar datas:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
