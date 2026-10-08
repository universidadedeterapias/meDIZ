/**
 * Testes do aviso "pesquisou depois da onda" (src/lib/reativacao/pesquisou.ts).
 * Sem banco e sem rede: as dependencias sao trocadas por versoes em memoria.
 *
 *   npx tsx src/scripts/test-reativacao-pesquisou.ts
 */
import { avisaPesquisaDaReativacao, type DependenciasAviso, type DestinatarioDaOnda } from '@/lib/reativacao/pesquisou'

let ok = 0
let falhas = 0
async function caso(nome: string, fn: () => Promise<void>) {
  try {
    await fn()
    ok++
    console.log(`  ok   ${nome}`)
  } catch (e) {
    falhas++
    console.log(`  FALHOU ${nome}\n       ${e instanceof Error ? e.message : e}`)
  }
}
function igual(a: unknown, b: unknown, rotulo: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${rotulo}: esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`)
}

const AGORA = new Date('2026-10-08T15:00:00Z')
const DEST: DestinatarioDaOnda = {
  id: 'd1', conversationId: 'conv-1', campanhaId: 'c1', campanha: 'Onda 8/10',
  crmScenarioId: 'cen-1', crmStepId: 'etapa-chegada'
}

function deps(o: { dest?: DestinatarioDaOnda | null; n8nOk?: boolean } = {}) {
  const avisos: Array<{ url: string; corpo: Record<string, unknown> }> = []
  const marcados: string[] = []
  const buscas: Date[] = []
  const d: DependenciasAviso = {
    agora: () => AGORA,
    url: 'http://n8n/webhook/reativacao/pesquisou',
    async buscarUltimaOnda(_userId, desde) { buscas.push(desde); return o.dest === undefined ? DEST : o.dest },
    async avisar(url, corpo) { avisos.push({ url, corpo }); return o.n8nOk ?? true },
    async marcarPesquisou(id) { marcados.push(id) }
  }
  return { d, avisos, marcados, buscas }
}

async function main() {
  console.log('\nAviso de pesquisa da reativacao\n')

  await caso('recebeu onda e pesquisou: avisa o n8n com a conversa e marca pesquisou_em', async () => {
    const t = deps()
    igual(await avisaPesquisaDaReativacao('u1', t.d), 'avisado', 'resultado')
    igual(t.avisos.length, 1, 'avisos')
    const c = t.avisos[0].corpo
    igual([c.evento, c.conversationId, c.crmScenarioId, c.destinatarioId, c.userId], ['pesquisou', 'conv-1', 'cen-1', 'd1', 'u1'], 'corpo')
    igual(t.marcados, ['d1'], 'marcado')
  })

  await caso('busca so ondas dos ultimos 7 dias', async () => {
    const t = deps()
    await avisaPesquisaDaReativacao('u1', t.d)
    igual(t.buscas[0].toISOString(), '2026-10-01T15:00:00.000Z', 'desde')
  })

  await caso('sem onda recente (ou ja pesquisou): nao chama o n8n', async () => {
    const t = deps({ dest: null })
    igual(await avisaPesquisaDaReativacao('u1', t.d), 'sem_onda', 'resultado')
    igual([t.avisos.length, t.marcados.length], [0, 0], 'nada feito')
  })

  await caso('n8n fora: nao marca, para tentar de novo na proxima pesquisa', async () => {
    const t = deps({ n8nOk: false })
    igual(await avisaPesquisaDaReativacao('u1', t.d), 'falhou', 'resultado')
    igual(t.marcados.length, 0, 'nao marcado')
  })

  console.log(`\n${ok}/${ok + falhas} passaram`)
  process.exit(falhas ? 1 : 0)
}

main()
