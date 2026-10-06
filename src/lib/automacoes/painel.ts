import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { inicioDoDiaBrasilia, type FonteN8n } from '@/lib/vigia/vigia'

/**
 * Dados da tela /admin/automacoes (Story 6.4): o que o portao de envio
 * registrou, os alertas do vigia e o estado de cada fluxo no n8n.
 */

/** Cada fluxo do portao e o workflow do n8n que manda por ele. */
export const FLUXOS: Record<string, { nome: string; workflowId: string }> = {
  entrega_acesso: { nome: 'Entrega de Acesso', workflowId: 'ATlvjuTn4lCVZRSR' },
  rastreio_livro: { nome: 'Aviso de rastreio do livro', workflowId: 'zKjrdJpq5gwhilX4' },
  trial_fim: { nome: 'Fim do Trial', workflowId: 'vTURhr3n6CydCslx' },
  despertadores: { nome: 'Despertadores', workflowId: 'TWfDbGIWUVYxE3iG' },
  recuperacao: { nome: 'Recuperação de Vendas', workflowId: 'SiCcnM4uf3NldK9w' },
  reativacao: { nome: 'Reativação (ondas)', workflowId: 'Xn1lxsDI9XAiA21M' },
  promo97_digital: { nome: 'PROMO 97 | DIGITAL (Z-API)', workflowId: 'bkHXCsj2jaehrAHX' }
}

const DIA = 24 * 60 * 60 * 1000

export type EstadoN8n = {
  ativo: boolean
  ultimaExecucao: string | null
  ultimoStatus: string | null
  errosUltimas24h: number
  url: string
}

export type LinhaFluxo = {
  fluxo: string
  nome: string
  ligado: boolean
  tetoDiario: number
  limitePessoa24h: number
  contaNoLimitePessoa: boolean
  atualizadoPor: string | null
  atualizadoEm: string
  hoje: { enviado: number; barrado: number; falhou: number; incerto: number; ocupaTeto: number }
  ultimoEnvio: string | null
  n8n: EstadoN8n | null
}

export type Painel = {
  geradoEm: string
  hoje: { enviado: number; barrado: number; falhou: number; incerto: number; porCategoria: Record<string, number> }
  porDia: Array<Record<string, number | string>>
  fluxos: LinhaFluxo[]
  alertas: Array<{
    chave: string
    titulo: string
    gravidade: string
    detalhe: string | null
    vezes: number
    primeiraVezEm: string
    ultimaVezEm: string
    enviadoEm: string
  }>
  alertasAbertos: number
  n8nDisponivel: boolean
  erroN8n: string | null
}

const vazio = () => ({ enviado: 0, barrado: 0, falhou: 0, incerto: 0, ocupaTeto: 0 })

export async function montarPainel(n8n: FonteN8n | null, urlN8n: string, agora = new Date()): Promise<Painel> {
  const hoje = inicioDoDiaBrasilia(agora)
  const ha14Dias = new Date(hoje.getTime() - 13 * DIA)

  const [statusHoje, categoriasHoje, porDiaBruto, configs, ultimos, alertas] = await Promise.all([
    prisma.$queryRaw<{ fluxo: string; status: string; n: bigint }[]>(Prisma.sql`
      SELECT fluxo, status, count(*) AS n
        FROM mensagens_enviadas
       WHERE tentativa_em >= ${hoje}
       GROUP BY fluxo, status
    `),
    prisma.$queryRaw<{ categoria: string | null; n: bigint }[]>(Prisma.sql`
      SELECT categoria, count(*) AS n
        FROM mensagens_enviadas
       WHERE status = 'enviado' AND enviado_em >= ${hoje}
       GROUP BY categoria
    `),
    prisma.$queryRaw<{ dia: string; fluxo: string; n: bigint }[]>(Prisma.sql`
      SELECT to_char(enviado_em - INTERVAL '3 hours', 'YYYY-MM-DD') AS dia, fluxo, count(*) AS n
        FROM mensagens_enviadas
       WHERE status = 'enviado' AND enviado_em >= ${ha14Dias}
       GROUP BY 1, 2
    `),
    prisma.fluxoAutomacao.findMany({ orderBy: { fluxo: 'asc' } }),
    prisma.$queryRaw<{ fluxo: string; ultimo: Date }[]>(Prisma.sql`
      SELECT fluxo, max(enviado_em) AS ultimo FROM mensagens_enviadas WHERE status = 'enviado' GROUP BY fluxo
    `),
    prisma.alertaAutomacao.findMany({ orderBy: { ultimaVezEm: 'desc' }, take: 30 })
  ])

  // Por fluxo, hoje
  const porFluxo = new Map<string, ReturnType<typeof vazio>>()
  const total = { enviado: 0, barrado: 0, falhou: 0, incerto: 0 }
  for (const l of statusHoje) {
    const f = porFluxo.get(l.fluxo) ?? vazio()
    const n = Number(l.n)
    if (l.status in f) f[l.status as keyof typeof total] += n
    if (l.status in total) total[l.status as keyof typeof total] += n
    if (l.status === 'enviado' || l.status === 'reservado' || l.status === 'incerto') f.ocupaTeto += n
    porFluxo.set(l.fluxo, f)
  }

  // 14 dias, com zeros nos dias sem envio
  const dias: string[] = []
  // ha14Dias e meia-noite de Brasilia (03:00 UTC); tirar 3h da a data local.
  for (let i = 0; i < 14; i++) dias.push(new Date(ha14Dias.getTime() + i * DIA - 3 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const porDia = dias.map((dia) => {
    const linha: Record<string, number | string> = { dia }
    for (const f of Object.keys(FLUXOS)) linha[f] = 0
    return linha
  })
  const indice = new Map(porDia.map((l, i) => [l.dia as string, i]))
  for (const l of porDiaBruto) {
    const i = indice.get(l.dia)
    if (i !== undefined) porDia[i][l.fluxo] = Number(l.n)
  }

  // n8n: estado de cada workflow. Falha nao derruba a tela.
  let erroN8n: string | null = null
  const estados = new Map<string, EstadoN8n>()
  if (n8n) {
    try {
      const [workflows, comErro] = await Promise.all([n8n.workflows(), n8n.execucoesComErro(250)])
      const ativos = new Map(workflows.map((w) => [w.id, w.active]))
      await Promise.all(
        Object.values(FLUXOS).map(async ({ workflowId }) => {
          const [ultima] = await n8n.execucoes(workflowId, 1)
          estados.set(workflowId, {
            ativo: ativos.get(workflowId) ?? false,
            ultimaExecucao: ultima?.startedAt ?? null,
            ultimoStatus: ultima?.status ?? null,
            errosUltimas24h: comErro.filter(
              (e) => e.workflowId === workflowId && agora.getTime() - new Date(e.startedAt).getTime() <= DIA
            ).length,
            url: `${urlN8n}/workflow/${workflowId}`
          })
        })
      )
    } catch (e) {
      erroN8n = e instanceof Error ? e.message : String(e)
    }
  } else {
    erroN8n = 'N8N_API_KEY não configurada'
  }

  const ultimoPorFluxo = new Map(ultimos.map((u) => [u.fluxo, u.ultimo]))
  const categorias: Record<string, number> = {}
  for (const c of categoriasHoje) categorias[c.categoria ?? 'sem categoria'] = Number(c.n)

  // Alerta "aberto": detectado de novo nas ultimas 2 rodadas do vigia.
  const MEIA_HORA = 30 * 60 * 1000
  const alertasAbertos = alertas.filter((a) => agora.getTime() - a.ultimaVezEm.getTime() <= MEIA_HORA).length

  return {
    geradoEm: agora.toISOString(),
    hoje: { ...total, porCategoria: categorias },
    porDia,
    fluxos: configs.map((c) => ({
      fluxo: c.fluxo,
      nome: FLUXOS[c.fluxo]?.nome ?? c.nome,
      ligado: c.ligado,
      tetoDiario: c.tetoDiario,
      limitePessoa24h: c.limitePessoa24h,
      contaNoLimitePessoa: c.contaNoLimitePessoa,
      atualizadoPor: c.atualizadoPor,
      atualizadoEm: c.atualizadoEm.toISOString(),
      hoje: porFluxo.get(c.fluxo) ?? vazio(),
      ultimoEnvio: ultimoPorFluxo.get(c.fluxo)?.toISOString() ?? null,
      n8n: FLUXOS[c.fluxo] ? estados.get(FLUXOS[c.fluxo].workflowId) ?? null : null
    })),
    alertas: alertas.map((a) => ({
      chave: a.chave,
      titulo: a.titulo,
      gravidade: a.gravidade,
      detalhe: a.detalhe,
      vezes: a.vezes,
      primeiraVezEm: a.primeiraVezEm.toISOString(),
      ultimaVezEm: a.ultimaVezEm.toISOString(),
      enviadoEm: a.enviadoEm.toISOString()
    })),
    alertasAbertos,
    n8nDisponivel: !erroN8n,
    erroN8n
  }
}

export type FiltroMensagens = {
  fluxo?: string | null
  status?: string | null
  busca?: string | null
  offset?: number
  limite?: number
}

export async function listarMensagens(f: FiltroMensagens) {
  const busca = f.busca?.trim() || null
  const soDigitos = busca?.replace(/\D/g, '') || null
  const where: Prisma.MensagemEnviadaWhereInput = {
    ...(f.fluxo ? { fluxo: f.fluxo } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(busca
      ? {
          OR: [
            ...(soDigitos && soDigitos.length >= 4 ? [{ telefone: { contains: soDigitos } }] : []),
            { chave: { contains: busca, mode: 'insensitive' as const } },
            { template: { contains: busca, mode: 'insensitive' as const } }
          ]
        }
      : {})
  }
  const take = Math.min(Math.max(f.limite ?? 25, 1), 100)
  const skip = Math.max(f.offset ?? 0, 0)
  const [total, itens] = await Promise.all([
    prisma.mensagemEnviada.count({ where }),
    prisma.mensagemEnviada.findMany({
      where,
      orderBy: { tentativaEm: 'desc' },
      take,
      skip,
      select: {
        id: true, chave: true, fluxo: true, telefone: true, template: true, categoria: true,
        status: true, motivo: true, tentativas: true, httpStatus: true, conversationId: true,
        n8nWorkflowId: true, n8nExecucaoId: true, tentativaEm: true, enviadoEm: true
      }
    })
  ])
  return { total, itens }
}
