/**
 * Teste do portao de envio (Story 6.1), sem banco e sem Chatvolt.
 *
 *   npm run test:portao
 *
 * O repositorio em memoria reproduz as regras do SQL de repositorio-prisma.ts:
 * chave unica, so `falhou`/`barrado` voltam para a fila, e as contagens de
 * teto e de limite por pessoa olham `reservado`, `enviado` e `incerto`.
 */
import {
  enviarPeloPortao,
  inicioDoDiaBrasilia,
  PedidoInvalido,
  type CanalTemplate,
  type ConfigFluxo,
  type CorpoTemplate,
  type DependenciasPortao,
  type Finalizacao,
  type PedidoEnvio,
  type RepositorioPortao,
  type RespostaCanal,
  type StatusEnvio
} from '../lib/mensagens/portao'

type Linha = {
  id: string
  chave: string
  fluxo: string
  telefone: string
  status: StatusEnvio
  motivo: string | null
  tentativas: number
  tentativaEm: Date
  conversationId: string | null
}

const OCUPAM = new Set<StatusEnvio>(['reservado', 'enviado', 'incerto'])

function repoEmMemoria(fluxos: ConfigFluxo[]) {
  const linhas: Linha[] = []
  const config = new Map(fluxos.map((f) => [f.fluxo, f]))
  let seq = 0
  const repo: RepositorioPortao = {
    async reservar(p, agora) {
      const existente = linhas.find((l) => l.chave === p.chave)
      if (!existente) {
        const l: Linha = {
          id: `m${++seq}`, chave: p.chave, fluxo: p.fluxo, telefone: p.telefone, status: 'reservado',
          motivo: null, tentativas: 1, tentativaEm: agora, conversationId: null
        }
        linhas.push(l)
        return { tipo: 'nova', id: l.id }
      }
      if (existente.status === 'falhou' || existente.status === 'barrado') {
        Object.assign(existente, { status: 'reservado', motivo: null, tentativas: existente.tentativas + 1, tentativaEm: agora })
        return { tipo: 'retentativa', id: existente.id }
      }
      return { tipo: 'existente', envio: { id: existente.id, status: existente.status, motivo: existente.motivo, conversationId: existente.conversationId } }
    },
    async buscarFluxo(f) {
      return config.get(f) ?? null
    },
    async contarDoFluxo(f, desde, excetoId) {
      return linhas.filter((l) => l.fluxo === f && OCUPAM.has(l.status) && l.tentativaEm >= desde && l.id !== excetoId).length
    },
    async contarDaPessoa(tel, desde, excetoId) {
      return linhas.filter(
        (l) => l.telefone === tel && OCUPAM.has(l.status) && l.tentativaEm >= desde && l.id !== excetoId && config.get(l.fluxo)?.contaNoLimitePessoa
      ).length
    },
    async finalizar(id, d: Finalizacao) {
      const l = linhas.find((x) => x.id === id)!
      Object.assign(l, { status: d.status, motivo: d.motivo ?? null, conversationId: d.conversationId ?? null })
    }
  }
  return { repo, linhas, config }
}

function canalRoteirizado(roteiro: RespostaCanal[] = []) {
  const enviados: CorpoTemplate[] = []
  const canal: CanalTemplate = {
    async enviar(corpo) {
      enviados.push(corpo)
      return roteiro.shift() ?? { tipo: 'aceito', httpStatus: 200, corpo: { messages: [{ conversationId: `conv-${enviados.length}` }] } }
    }
  }
  return { canal, enviados }
}

const fluxo = (f: string, o: Partial<ConfigFluxo> = {}): ConfigFluxo => ({
  fluxo: f, ligado: true, tetoDiario: 100, contaNoLimitePessoa: true, limitePessoa24h: 3, ...o
})

const pedido = (chave: string, o: Partial<PedidoEnvio> = {}, corpo: Partial<CorpoTemplate> = {}): PedidoEnvio => ({
  fluxo: 'trial_fim',
  chave,
  corpo: { to: '+55 (11) 98888-7777', templateName: 'dia6_alteracao_plano', templateLangCode: 'pt_BR', var_1: 'Ana', ...corpo },
  ...o
})

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

const AGORA = new Date('2026-10-06T13:00:00.000Z') // 10h em Brasilia

function deps(repo: RepositorioPortao, canal: CanalTemplate, agora = AGORA): DependenciasPortao {
  return { repo, canal, agora: () => agora, agentIdPadrao: 'agente-padrao' }
}

async function main() {
  console.log('Portao de envio')

  await caso('primeiro envio sai e devolve o conversationId', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim')])
    const { canal, enviados } = canalRoteirizado()
    const r = await enviarPeloPortao(pedido('trial_fim:u1:1'), deps(repo, canal))
    igual(r.status, 'enviado', 'status')
    igual(r.conversationId, 'conv-1', 'conversationId')
    igual(enviados.length, 1, 'chamadas ao Chatvolt')
  })

  await caso('mesma chave de novo: ja_enviado, sem chamar o Chatvolt', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim')])
    const { canal, enviados } = canalRoteirizado()
    await enviarPeloPortao(pedido('trial_fim:u1:1'), deps(repo, canal))
    const r = await enviarPeloPortao(pedido('trial_fim:u1:1'), deps(repo, canal))
    igual(r.status, 'ja_enviado', 'status')
    igual(r.conversationId, 'conv-1', 'conversationId do envio original')
    igual(enviados.length, 1, 'chamadas ao Chatvolt')
  })

  await caso('incidente do trial: 10 rodadas para as mesmas 5 pessoas mandam 5 mensagens', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim', { tetoDiario: 150 })])
    const { canal, enviados } = canalRoteirizado()
    for (let rodada = 0; rodada < 10; rodada++) {
      const agora = new Date(AGORA.getTime() + rodada * 30 * 60 * 1000)
      for (let u = 1; u <= 5; u++) {
        await enviarPeloPortao(pedido(`trial_fim:u${u}:1`, {}, { to: `55119888800${u}0` }), deps(repo, canal, agora))
      }
    }
    igual(enviados.length, 5, 'mensagens enviadas')
  })

  await caso('reserva presa (processo caiu no meio): nao reenvia', async () => {
    const { repo, linhas } = repoEmMemoria([fluxo('trial_fim')])
    const { canal, enviados } = canalRoteirizado()
    await repo.reservar({ ...pedido('k1'), telefone: '5511988887777' }, AGORA)
    const r = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r.status, 'ja_enviado', 'status')
    igual(enviados.length, 0, 'chamadas ao Chatvolt')
    igual(linhas[0].status, 'reservado', 'linha intacta')
  })

  await caso('Chatvolt 5xx: falhou, e a mesma chave pode tentar de novo', async () => {
    const { repo, linhas } = repoEmMemoria([fluxo('trial_fim')])
    const { canal, enviados } = canalRoteirizado([{ tipo: 'erro_servidor', httpStatus: 503, corpo: 'indisponivel' }])
    const r1 = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r1.status, 'falhou', 'primeira')
    const r2 = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r2.status, 'enviado', 'retentativa')
    igual(enviados.length, 2, 'chamadas ao Chatvolt')
    igual(linhas[0].tentativas, 2, 'tentativas')
  })

  await caso('Chatvolt 4xx: falhou com o motivo', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim')])
    const { canal } = canalRoteirizado([{ tipo: 'recusado', httpStatus: 400, corpo: { error: 'template nao aprovado' } }])
    const r = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r.status, 'falhou', 'status')
    if (!r.motivo?.includes('template nao aprovado')) throw new Error(`motivo sem o erro do Chatvolt: ${r.motivo}`)
  })

  await caso('Chatvolt sem resposta: incerto, e a mesma chave NAO reenvia', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim')])
    const { canal, enviados } = canalRoteirizado([{ tipo: 'sem_resposta', erro: 'sem resposta em 20000ms' }])
    const r1 = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r1.status, 'incerto', 'primeira')
    const r2 = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r2.status, 'incerto', 'segunda')
    igual(enviados.length, 1, 'chamadas ao Chatvolt')
  })

  await caso('fluxo desligado: barrado; religado, a mesma chave sai', async () => {
    const { repo, config } = repoEmMemoria([fluxo('trial_fim', { ligado: false })])
    const { canal, enviados } = canalRoteirizado()
    const r1 = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual([r1.status, r1.motivo], ['barrado', 'fluxo desligado'], 'desligado')
    config.get('trial_fim')!.ligado = true
    const r2 = await enviarPeloPortao(pedido('k1'), deps(repo, canal))
    igual(r2.status, 'enviado', 'religado')
    igual(enviados.length, 1, 'chamadas ao Chatvolt')
  })

  await caso('fluxo nao cadastrado: barrado', async () => {
    const { repo } = repoEmMemoria([])
    const { canal, enviados } = canalRoteirizado()
    const r = await enviarPeloPortao(pedido('k1', { fluxo: 'novo_fluxo' }), deps(repo, canal))
    igual(r.status, 'barrado', 'status')
    igual(enviados.length, 0, 'chamadas ao Chatvolt')
  })

  await caso('teto diario: a terceira do dia e barrada; no dia seguinte sai', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim', { tetoDiario: 2 })])
    const { canal, enviados } = canalRoteirizado()
    const tel = (n: number) => ({ to: `5511900000${n}00` })
    igual((await enviarPeloPortao(pedido('a', {}, tel(1)), deps(repo, canal))).status, 'enviado', '1a')
    igual((await enviarPeloPortao(pedido('b', {}, tel(2)), deps(repo, canal))).status, 'enviado', '2a')
    const r3 = await enviarPeloPortao(pedido('c', {}, tel(3)), deps(repo, canal))
    igual(r3.status, 'barrado', '3a')
    const amanha = new Date(AGORA.getTime() + 24 * 60 * 60 * 1000)
    igual((await enviarPeloPortao(pedido('c', {}, tel(3)), deps(repo, canal, amanha))).status, 'enviado', '3a no dia seguinte')
    igual(enviados.length, 3, 'chamadas ao Chatvolt')
  })

  await caso('limite por pessoa soma os fluxos; mensagem pedida (acesso) nao conta nem e barrada', async () => {
    const { repo } = repoEmMemoria([
      fluxo('trial_fim', { limitePessoa24h: 2 }),
      fluxo('reativacao', { limitePessoa24h: 2 }),
      fluxo('entrega_acesso', { contaNoLimitePessoa: false })
    ])
    const { canal, enviados } = canalRoteirizado()
    igual((await enviarPeloPortao(pedido('acesso', { fluxo: 'entrega_acesso' }), deps(repo, canal))).status, 'enviado', 'acesso')
    igual((await enviarPeloPortao(pedido('t1'), deps(repo, canal))).status, 'enviado', 'trial')
    igual((await enviarPeloPortao(pedido('r1', { fluxo: 'reativacao' }), deps(repo, canal))).status, 'enviado', 'reativacao')
    const r = await enviarPeloPortao(pedido('r2', { fluxo: 'reativacao' }), deps(repo, canal))
    igual(r.status, 'barrado', 'terceira de marketing')
    igual((await enviarPeloPortao(pedido('acesso2', { fluxo: 'entrega_acesso' }), deps(repo, canal))).status, 'enviado', 'acesso nao e barrado')
    igual(enviados.length, 4, 'chamadas ao Chatvolt')
  })

  await caso('corpo: telefone normalizado, agente padrao e campos estranhos fora', async () => {
    const { repo } = repoEmMemoria([fluxo('trial_fim')])
    const { canal, enviados } = canalRoteirizado()
    await enviarPeloPortao(
      pedido('k1', {}, { buttons: [{ type: 'quick_reply', value: 'OK', index: 0 }], crm_step_id: 'x' } as Partial<CorpoTemplate>),
      deps(repo, canal)
    )
    const c = enviados[0] as Record<string, unknown>
    igual(c.to, '5511988887777', 'to')
    igual(c.agentId, 'agente-padrao', 'agentId')
    igual('crm_step_id' in c, false, 'campo estranho removido')
    igual(Array.isArray(c.buttons), true, 'botoes mantidos')
  })

  await caso('telefone sem DDI e recusado antes de reservar', async () => {
    const { repo, linhas } = repoEmMemoria([fluxo('trial_fim')])
    const { canal } = canalRoteirizado()
    let erro: unknown = null
    try {
      await enviarPeloPortao(pedido('k1', {}, { to: '1198888777' }), deps(repo, canal))
    } catch (e) {
      erro = e
    }
    igual(erro instanceof PedidoInvalido, true, 'PedidoInvalido')
    igual(linhas.length, 0, 'nada reservado')
  })

  await caso('numero dos EUA (DDI 1 + 10 digitos) e aceito', async () => {
    const { repo } = repoEmMemoria([fluxo('entrega_acesso', { contaNoLimitePessoa: false })])
    const { canal, enviados } = canalRoteirizado()
    const r = await enviarPeloPortao(pedido('k1', { fluxo: 'entrega_acesso' }, { to: '+1 (415) 555-0100' }), deps(repo, canal))
    igual(r.status, 'enviado', 'status')
    igual(enviados[0].to, '14155550100', 'to')
  })

  await caso('dia de Brasilia: 02h UTC ainda e o dia anterior', async () => {
    igual(inicioDoDiaBrasilia(new Date('2026-10-06T02:00:00Z')).toISOString(), '2026-10-05T03:00:00.000Z', '02h UTC')
    igual(inicioDoDiaBrasilia(new Date('2026-10-06T03:00:00Z')).toISOString(), '2026-10-06T03:00:00.000Z', '03h UTC')
  })

  console.log(`\n${total - falhas}/${total} passaram`)
  if (falhas) process.exit(1)
}

main()
