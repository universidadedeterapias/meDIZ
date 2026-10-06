/**
 * Teste do vigia das automacoes (Story 6.3), sem banco, sem n8n e sem Telegram.
 *
 *   npm run test:vigia
 *
 * O registro de alertas em memoria reproduz o de fontes.ts: alerta novo sai,
 * alerta repetido so sai de novo depois do silencio, e um envio ao Telegram
 * que falha nao conta como enviado.
 */
import {
  executarVigia,
  formatarAlertas,
  resumoDiario,
  type Alerta,
  type DependenciasVigia,
  type ExecucaoN8n,
  type FonteMensagens,
  type FonteN8n,
  type RegistroAlertas
} from '../lib/vigia/vigia'

const AGORA = new Date('2026-10-06T15:00:00.000Z') // 12h em Brasilia
const minAtras = (m: number) => new Date(AGORA.getTime() - m * 60_000).toISOString()

function mensagens(o: Partial<FonteMensagens> = {}): FonteMensagens {
  return {
    repetidas: async () => [],
    enviadosPorFluxo: async () => [],
    maiorHoraPorFluxo: async () => [],
    doDiaComTeto: async () => [],
    barradosPorTeto: async () => [],
    falhas: async () => [],
    reservasPresas: async () => [],
    resumo: async () => [],
    ...o
  }
}

const exec = (workflowId: string, min: number, mode = 'trigger', status = 'success', id = `e${Math.random()}`): ExecucaoN8n => ({
  id, workflowId, status, mode, startedAt: minAtras(min)
})

function n8n(o: Partial<FonteN8n> = {}): FonteN8n {
  return {
    workflows: async () => [],
    execucoes: async () => [],
    execucoesComErro: async () => [],
    ultimasExecucoes: async () => [exec('qualquer', 2)],
    ...o
  }
}

function registroEmMemoria() {
  const linhas = new Map<string, { enviadoEm: number; vezes: number }>()
  const registro: RegistroAlertas = {
    async filtrarParaEnvio(alertas: Alerta[], agora: Date) {
      const sair: Alerta[] = []
      for (const a of alertas) {
        const l = linhas.get(a.chave)
        if (!l) {
          linhas.set(a.chave, { enviadoEm: 0, vezes: 1 })
          sair.push(a)
          continue
        }
        l.vezes++
        if (agora.getTime() - l.enviadoEm >= a.silencioMin * 60_000) sair.push(a)
      }
      return sair
    },
    async marcarEnviados(chaves, agora) {
      for (const c of chaves) linhas.get(c)!.enviadoEm = agora.getTime()
    }
  }
  return { registro, linhas }
}

function deps(o: Partial<DependenciasVigia> & { agora?: () => Date } = {}) {
  const enviados: string[] = []
  const { registro } = registroEmMemoria()
  const d: DependenciasVigia = {
    mensagens: mensagens(),
    n8n: n8n(),
    registro,
    enviarTelegram: async (html) => {
      enviados.push(html)
    },
    agora: () => AGORA,
    ...o
  }
  return { d, enviados }
}

let falhas = 0
let total = 0
async function caso(nome: string, fn: () => Promise<void>) {
  total++
  try {
    await fn()
    console.log(`  ok   ${nome}`)
  } catch (e) {
    falhas++
    console.log(`  FALHOU ${nome}\n         ${e instanceof Error ? e.message : e}`)
  }
}
function igual<T>(atual: T, esperado: T, oque: string) {
  if (JSON.stringify(atual) !== JSON.stringify(esperado)) {
    throw new Error(`${oque}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(atual)}`)
  }
}
function contem(texto: string, trecho: string) {
  if (!texto.includes(trecho)) throw new Error(`esperava "${trecho}" em:\n${texto}`)
}

async function main() {
  console.log('Vigia')

  await caso('tudo normal: nada vai para o Telegram', async () => {
    const { d, enviados } = deps()
    const r = await executarVigia(d)
    igual([r.detectados, r.enviados, enviados.length], [0, 0, 0], 'detectados/enviados')
  })

  await caso('incidente do trial: mensagem repetida vira alerta critico', async () => {
    const { d, enviados } = deps({
      mensagens: mensagens({ repetidas: async () => [{ telefone: '5511988887777', template: 'dia6_alteracao_plano', n: 9 }] })
    })
    await executarVigia(d)
    contem(enviados[0], 'Mensagem repetida')
    contem(enviados[0], 'dia6_alteracao_plano saiu 9x')
  })

  await caso('pico: 40 na ultima hora contra maior hora de 5 alerta; 20 nao (piso de 30)', async () => {
    const a = deps({
      mensagens: mensagens({
        enviadosPorFluxo: async () => [{ fluxo: 'trial_fim', n: 40 }],
        maiorHoraPorFluxo: async () => [{ fluxo: 'trial_fim', max: 5 }]
      })
    })
    igual((await executarVigia(a.d)).enviados, 1, 'com pico')
    const b = deps({
      mensagens: mensagens({
        enviadosPorFluxo: async () => [{ fluxo: 'trial_fim', n: 20 }],
        maiorHoraPorFluxo: async () => [{ fluxo: 'trial_fim', max: 2 }]
      })
    })
    igual((await executarVigia(b.d)).enviados, 0, 'abaixo do piso')
  })

  await caso('teto: 85 de 100 e atencao; barrado por teto e critico', async () => {
    const { d, enviados } = deps({
      mensagens: mensagens({
        doDiaComTeto: async () => [{ fluxo: 'reativacao', n: 85, teto: 100 }],
        barradosPorTeto: async () => [{ fluxo: 'trial_fim', n: 3 }]
      })
    })
    await executarVigia(d)
    contem(enviados[0], '🟡 <b>Perto do teto do dia: reativacao</b>')
    contem(enviados[0], '🔴 <b>Teto do dia atingido: trial_fim</b>')
    igual(enviados[0].indexOf('🔴') < enviados[0].indexOf('🟡'), true, 'critico antes de atencao')
  })

  await caso('falhas: 2 nao alertam, 3 alertam; 1 incerto ja alerta', async () => {
    const { d, enviados } = deps({
      mensagens: mensagens({
        falhas: async () => [
          { fluxo: 'reativacao', status: 'falhou', n: 2, motivo: 'x' },
          { fluxo: 'trial_fim', status: 'falhou', n: 3, motivo: 'Chatvolt falhou (HTTP 503)' },
          { fluxo: 'entrega_acesso', status: 'incerto', n: 1, motivo: null }
        ]
      })
    })
    const r = await executarVigia(d)
    igual(r.enviados, 2, 'alertas')
    contem(enviados[0], 'Envios falhando: trial_fim')
    contem(enviados[0], 'Chatvolt sem resposta: entrega_acesso')
  })

  await caso('reserva presa no portao alerta', async () => {
    const { d, enviados } = deps({ mensagens: mensagens({ reservasPresas: async () => [{ fluxo: 'trial_fim', n: 1 }] }) })
    await executarVigia(d)
    contem(enviados[0], 'Envio preso no portão: trial_fim')
  })

  await caso('n8n sem nenhuma execucao ha 45 min alerta', async () => {
    const { d, enviados } = deps({ n8n: n8n({ ultimasExecucoes: async () => [exec('x', 45)] }) })
    await executarVigia(d)
    contem(enviados[0], 'n8n sem executar nada')
  })

  await caso('fluxo agendado parado: conta so execucao de agenda, nao webhook; inativo nao conta', async () => {
    const { d, enviados } = deps({
      n8n: n8n({
        workflows: async () => [
          { id: 'vTURhr3n6CydCslx', name: 'Fim do Trial', active: true },
          { id: 'zKjrdJpq5gwhilX4', name: 'LIVRO', active: true },
          { id: 'TWfDbGIWUVYxE3iG', name: 'Despertadores', active: false } // desligado: nao alerta
        ],
        execucoes: async (id) =>
          id === 'vTURhr3n6CydCslx'
            ? [exec(id, 1, 'webhook'), exec(id, 90, 'trigger')] // webhook recente nao esconde a agenda parada
            : [exec(id, 60, 'trigger')] // rastreio roda 2x ao dia: 1h e normal
      })
    })
    await executarVigia(d)
    igual(enviados.length, 1, 'mensagens')
    contem(enviados[0], 'Fluxo parado: Fim do Trial')
    if (enviados[0].includes('LIVRO')) throw new Error('rastreio nao deveria alertar')
  })

  await caso('execucoes com erro nos ultimos 20 min, agrupadas por workflow, com link', async () => {
    const { d, enviados } = deps({
      urlN8n: 'https://n8n.exemplo',
      n8n: n8n({
        workflows: async () => [{ id: 'VbY0', name: 'Automações blog', active: true }],
        execucoesComErro: async () => [exec('VbY0', 5, 'trigger', 'error', '901'), exec('VbY0', 10, 'trigger', 'error', '900'), exec('VbY0', 300, 'trigger', 'error', '800')]
      })
    })
    await executarVigia(d)
    contem(enviados[0], 'Execução com erro: Automações blog')
    contem(enviados[0], '2 execução(ões) com erro')
    contem(enviados[0], 'https://n8n.exemplo/workflow/VbY0/executions/901')
  })

  await caso('API do n8n fora do ar vira alerta, e os alertas de mensagens saem mesmo assim', async () => {
    const { d, enviados } = deps({
      mensagens: mensagens({ reservasPresas: async () => [{ fluxo: 'trial_fim', n: 1 }] }),
      n8n: n8n({ ultimasExecucoes: async () => { throw new Error('HTTP 401') } })
    })
    await executarVigia(d)
    contem(enviados[0], 'Vigia sem acesso ao n8n')
    contem(enviados[0], 'Envio preso no portão')
  })

  await caso('silencio: o mesmo alerta nao repete em 15 min, volta depois do silencio', async () => {
    const { registro } = registroEmMemoria()
    const enviados: string[] = []
    const base = {
      mensagens: mensagens({ reservasPresas: async () => [{ fluxo: 'trial_fim', n: 1 }] }), // silencio 60 min
      n8n: n8n(),
      registro,
      enviarTelegram: async (h: string) => { enviados.push(h) }
    }
    await executarVigia({ ...base, agora: () => AGORA })
    await executarVigia({ ...base, agora: () => new Date(AGORA.getTime() + 15 * 60_000) })
    await executarVigia({ ...base, agora: () => new Date(AGORA.getTime() + 61 * 60_000) })
    igual(enviados.length, 2, 'mensagens no Telegram')
  })

  await caso('Telegram falhou: o alerta nao conta como enviado e sai na rodada seguinte', async () => {
    const { registro } = registroEmMemoria()
    const enviados: string[] = []
    let quebrado = true
    const base = {
      mensagens: mensagens({ reservasPresas: async () => [{ fluxo: 'trial_fim', n: 1 }] }),
      n8n: n8n(),
      registro,
      enviarTelegram: async (h: string) => {
        if (quebrado) throw new Error('Telegram fora')
        enviados.push(h)
      }
    }
    let erro: unknown = null
    try {
      await executarVigia({ ...base, agora: () => AGORA })
    } catch (e) {
      erro = e
    }
    igual(erro instanceof Error, true, 'primeira rodada lanca')
    quebrado = false
    await executarVigia({ ...base, agora: () => new Date(AGORA.getTime() + 15 * 60_000) })
    igual(enviados.length, 1, 'saiu na segunda')
  })

  await caso('sem N8N_API_KEY: vigia so as mensagens e avisa no retorno', async () => {
    const { d } = deps({ n8n: null })
    const r = await executarVigia(d)
    contem(r.erros.join(), 'N8N_API_KEY')
  })

  await caso('texto vai escapado para o HTML do Telegram', async () => {
    const html = formatarAlertas([{ chave: 'x', gravidade: 'critico', titulo: 'a<b>', detalhe: 'c & d', silencioMin: 1 }])
    contem(html, 'a&lt;b&gt;')
    contem(html, 'c &amp; d')
  })

  await caso('resumo diario do dia anterior, por fluxo e categoria', async () => {
    let pedido: [Date, Date] | null = null
    const { d, enviados } = deps({
      mensagens: mensagens({
        resumo: async (desde, ate) => {
          pedido = [desde, ate]
          return [
            { fluxo: 'trial_fim', status: 'enviado', categoria: 'MARKETING', n: 12 },
            { fluxo: 'trial_fim', status: 'barrado', categoria: null, n: 2 },
            { fluxo: 'entrega_acesso', status: 'enviado', categoria: 'UTILITY', n: 20 }
          ]
        }
      })
    })
    await resumoDiario(d)
    igual(pedido!.map((x: Date) => x.toISOString()), ['2026-10-05T03:00:00.000Z', '2026-10-06T03:00:00.000Z'], 'intervalo')
    contem(enviados[0], 'Resumo das mensagens — 05/10/2026')
    contem(enviados[0], 'trial_fim: 12 enviada(s) · 2 barrado')
    contem(enviados[0], '12 marketing · 20 utility')
  })

  console.log(`\n${total - falhas}/${total} passaram`)
  if (falhas) process.exit(1)
}

main()
