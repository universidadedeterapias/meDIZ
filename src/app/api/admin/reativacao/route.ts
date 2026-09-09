import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import {
  buscarPublico,
  filtrosPadrao,
  CORTE_PADRAO_DIAS,
  ESTADOS,
  ORIGENS,
  type Estado,
  type Origem
} from '@/lib/reativacao/publico'

export const dynamic = 'force-dynamic'

/**
 * O publico da reativacao, ja classificado, com o porque de cada classificacao.
 *
 * So leitura. O disparo e a integracao com o Chatvolt entram depois, em rota
 * propria — misturar "ver quem e" com "mandar mensagem" na mesma rota e como se
 * perde o habito de conferir antes de apertar o botao.
 */

function lista<T extends string>(
  valor: string | null,
  validos: readonly T[]
): T[] {
  if (!valor) return []
  const permitidos = new Set<string>(validos)
  return [...new Set(valor.split(',').map((v) => v.trim()).filter(Boolean))].filter(
    (v): v is T => permitidos.has(v)
  )
}

/** Tag é vocabulário aberto (não tem enum fechado como Estado/Origem), então
 *  não valida contra lista nenhuma — só limpa e deduplica. */
function listaLivre(valor: string | null, max = 50): string[] {
  if (!valor) return []
  return [...new Set(valor.split(',').map((v) => v.trim()).filter(Boolean))].slice(0, max)
}

/** `null` para data ausente ou que não parseia — filtro de data ruim não deve
 *  derrubar a consulta inteira, só ser ignorado. */
function dataOuNull(valor: string | null): string | null {
  if (!valor) return null
  return Number.isNaN(Date.parse(valor)) ? null : valor
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const p = request.nextUrl.searchParams
  const filtros = filtrosPadrao()

  const corte = Number(p.get('corte'))
  filtros.corte = Number.isFinite(corte) && corte > 0 ? Math.min(corte, 3650) : CORTE_PADRAO_DIAS

  filtros.estados = lista<Estado>(p.get('estado'), ESTADOS)
  filtros.incluirOrigens = lista<Origem>(p.get('incluir'), ORIGENS)
  filtros.excluirOrigens = lista<Origem>(p.get('excluir'), ORIGENS)
  filtros.incluirTags = listaLivre(p.get('incluirTags'))
  filtros.excluirTags = listaLivre(p.get('excluirTags'))
  filtros.idiomas = lista(p.get('idioma'), ['pt-BR', 'pt', 'es', 'en'] as const)
  filtros.semIdioma = p.get('semIdioma') === '1'
  filtros.atividadeDesde = dataOuNull(p.get('atividadeDesde'))
  filtros.atividadeAte = dataOuNull(p.get('atividadeAte'))
  filtros.compraDesde = dataOuNull(p.get('compraDesde'))
  filtros.compraAte = dataOuNull(p.get('compraAte'))

  const busca = p.get('busca')?.trim()
  filtros.busca = busca ? busca.slice(0, 120) : null

  const limit = Number(p.get('limit'))
  filtros.limit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50

  const offset = Number(p.get('offset'))
  filtros.offset = Number.isFinite(offset) ? Math.max(offset, 0) : 0

  try {
    const resultado = await buscarPublico(filtros)
    return NextResponse.json(resultado)
  } catch (e) {
    // A causa quase certa e a migration das views nao ter sido aplicada: sem
    // `user_reactivation_facts` a consulta falha inteira. Dizer isso poupa a
    // caçada no log.
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    const faltaView = /user_reactivation_facts|user_origins|user_last_seen/.test(msg)
    return NextResponse.json(
      {
        error: faltaView
          ? 'As views de reativação não existem no banco. Aplique a migration 20260907120000_add_reactivation_views.'
          : 'Falha ao consultar o público.',
        detalhe: msg
      },
      { status: faltaView ? 503 : 500 }
    )
  }
}
