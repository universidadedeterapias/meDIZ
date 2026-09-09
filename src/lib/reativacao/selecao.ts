import { prisma } from '@/lib/prisma'
import { montarFiltro, SQL_ESTADO } from './publico'
import type { Estado, SelecaoPublico } from './tipos'

/**
 * Resolve QUALQUER descritor de seleção na lista definitiva de pessoas.
 *
 * É o único lugar que decide "quem entra". `criarCampanha` nunca confia em
 * `userIds`/`total` vindos prontos do client além do que este descritor
 * permite recalcular — o client manda a INTENÇÃO (filtro + exclusões, ou uma
 * lista), o servidor sempre resolve de novo. Contagem exibida na tela é só
 * UX; a fonte de verdade é sempre esta função, rodada no momento de criar.
 */

export type LinhaResolvida = {
  user_id: string
  email: string
  nome: string | null
  whatsapp: string | null
  idioma: string | null
  estado: Estado
}

/** Trava de sanidade contra bug — a base tem ~3.310 pessoas hoje, nunca deve
 *  chegar nem perto disto. Não é uma expectativa real de volume. */
const LIMITE_SELECAO = 50_000

export async function resolverSelecao(sel: SelecaoPublico): Promise<LinhaResolvida[]> {
  if (sel.modo === 'lista') {
    const ids = [...new Set(sel.userIds)].slice(0, LIMITE_SELECAO)
    if (ids.length === 0) return []
    return prisma.$queryRawUnsafe<LinhaResolvida[]>(
      `SELECT f.user_id, f.email, f.nome, f.whatsapp, f.idioma, (${SQL_ESTADO}) AS estado
         FROM user_reactivation_facts f
        WHERE f.user_id = ANY($2::text[])`,
      sel.corte,
      ids
    )
  }

  const { args, whereCompleto } = montarFiltro(sel.filtros)
  const excluidos = [...new Set(sel.excluidos)]
  const whereFinal = excluidos.length
    ? `${whereCompleto ? `${whereCompleto} AND` : 'WHERE'} NOT (f.user_id = ANY($${args.length + 1}::text[]))`
    : whereCompleto
  const finalArgs = excluidos.length ? [...args, excluidos] : args

  return prisma.$queryRawUnsafe<LinhaResolvida[]>(
    `SELECT f.user_id, f.email, f.nome, f.whatsapp, f.idioma, (${SQL_ESTADO}) AS estado
       FROM user_reactivation_facts f
       ${whereFinal}
      ORDER BY f.ultimo_sinal_em DESC NULLS LAST, f.email
      LIMIT ${LIMITE_SELECAO}`,
    ...finalArgs
  )
}
