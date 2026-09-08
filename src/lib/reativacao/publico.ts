import { prisma } from '@/lib/prisma'
import {
  ESTADOS,
  type Estado,
  type Evidencia,
  type Filtros,
  type LinhaPublico,
  type Origem,
  type ResultadoPublico
} from './tipos'

/**
 * A consulta do publico da reativacao. So servidor.
 *
 * A classificacao de ORIGEM nao mora aqui: mora na view `user_origins`. Duas
 * copias da mesma regra divergem, e o filtro de origem precisa rodar no banco
 * para a contagem sair certa ANTES da paginacao — e a contagem e o unico numero
 * que impede disparo acidental em volume.
 *
 * O ESTADO mora aqui, em SQL, e a explicacao dele em `tipos.ts`. As duas dizem a
 * mesma coisa em linguas diferentes; mudar uma sem a outra faz o painel mentir
 * com confianca.
 */

export * from './tipos'

/**
 * O estado, com o corte como parametro.
 *
 * A ordem dos ramos e a regra: `nunca_acessou` vem antes de tudo porque conta
 * criada e nunca usada nao e "frio por abandono" — sao mil pessoas para quem a
 * mensagem "volta pro app" e factualmente falsa. `trial` vem antes do corte
 * porque trial parado e outro problema, nao o mesmo do assinante parado.
 */
const SQL_ESTADO = `
  CASE
    WHEN f.ultimo_sinal_em IS NULL AND f.first_access_at IS NULL THEN 'nunca_acessou'
    WHEN f.assinatura_status = 'trialing' THEN 'trial'
    WHEN f.assinatura_status = 'active'
         AND f.dias_sem_sinal IS NOT NULL AND f.dias_sem_sinal <= $1 THEN 'ativo'
    WHEN f.assinatura_status = 'active' THEN 'dormente'
    WHEN f.dias_sem_sinal IS NOT NULL AND f.dias_sem_sinal <= $1 THEN 'explorador'
    ELSE 'frio'
  END`

type LinhaBruta = {
  user_id: string
  email: string
  nome: string | null
  whatsapp: string | null
  idioma: string | null
  conta_criada_em: Date | null
  assinatura_status: string | null
  assinatura_desde: Date | null
  first_access_at: Date | null
  ultimo_sinal_em: Date | null
  ultima_fonte: string | null
  dias_sem_sinal: number | null
  estado: Estado
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

export { SQL_ESTADO }

export type ConsultaFiltrada = {
  /** $1 e sempre o corte. */
  args: unknown[]
  /** Sem o filtro de estado: serve as contagens, que mostram o todo. */
  whereSemEstado: string
  /** Com tudo. E o recorte que autoriza um disparo. */
  whereCompleto: string
}

/**
 * Traduz os filtros em SQL, uma vez so.
 *
 * Exportado porque a campanha materializa a MESMA lista que a tela mostrou. Se a
 * criacao da onda montasse o proprio WHERE, um dia os dois divergiriam e alguem
 * aprovaria um numero para disparar outro.
 */
export function montarFiltro(f: Filtros): ConsultaFiltrada {
  // $1 e sempre o corte, porque SQL_ESTADO o usa nas duas consultas.
  const args: unknown[] = [f.corte]
  const condicoes: string[] = []
  const proximo = () => `$${args.length + 1}`

  if (f.busca) {
    const p = proximo()
    condicoes.push(`(f.email ILIKE ${p} OR f.nome ILIKE ${p})`)
    args.push(`%${f.busca}%`)
  }
  if (f.idiomas.length > 0) {
    condicoes.push(`f.idioma = ANY(${proximo()}::text[])`)
    args.push(f.idiomas)
  }
  if (f.semIdioma) {
    condicoes.push('f.idioma IS NULL')
  }
  if (f.incluirOrigens.length > 0) {
    condicoes.push(
      `EXISTS (SELECT 1 FROM user_origins o
                WHERE o.user_id = f.user_id AND o.origem = ANY(${proximo()}::text[]))`
    )
    args.push(f.incluirOrigens)
  }
  if (f.excluirOrigens.length > 0) {
    condicoes.push(
      `NOT EXISTS (SELECT 1 FROM user_origins o
                    WHERE o.user_id = f.user_id AND o.origem = ANY(${proximo()}::text[]))`
    )
    args.push(f.excluirOrigens)
  }

  const whereSemEstado = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

  let whereCompleto = whereSemEstado
  if (f.estados.length > 0) {
    const p = proximo()
    args.push(f.estados)
    whereCompleto = condicoes.length
      ? `WHERE ${condicoes.join(' AND ')} AND (${SQL_ESTADO}) = ANY(${p}::text[])`
      : `WHERE (${SQL_ESTADO}) = ANY(${p}::text[])`
  }

  return { args, whereSemEstado, whereCompleto }
}

export async function buscarPublico(f: Filtros): Promise<ResultadoPublico> {
  const { args, whereSemEstado, whereCompleto } = montarFiltro(f)
  // A contagem por estado ignora o filtro de estado, entao usa so os argumentos
  // anteriores a ele — que e sempre o ultimo a entrar.
  const argsSemEstado = f.estados.length > 0 ? args.slice(0, -1) : args

  const [contagensBrutas, linhas] = await Promise.all([
    prisma.$queryRawUnsafe<{ estado: Estado; total: bigint }[]>(
      `SELECT (${SQL_ESTADO}) AS estado, count(*) AS total
         FROM user_reactivation_facts f
         ${whereSemEstado}
        GROUP BY 1`,
      ...argsSemEstado
    ),
    prisma.$queryRawUnsafe<LinhaBruta[]>(
      `SELECT f.user_id, f.email, f.nome, f.whatsapp, f.idioma, f.conta_criada_em,
              f.assinatura_status, f.assinatura_desde, f.first_access_at,
              f.ultimo_sinal_em, f.ultima_fonte, f.dias_sem_sinal,
              (${SQL_ESTADO}) AS estado
         FROM user_reactivation_facts f
         ${whereCompleto}
        ORDER BY f.ultimo_sinal_em DESC NULLS LAST, f.email
        LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
      ...args,
      f.limit,
      f.offset
    )
  ])

  const contagens = ESTADOS.reduce(
    (acc, e) => ({ ...acc, [e]: 0 }),
    {} as Record<Estado, number>
  )
  for (const c of contagensBrutas) contagens[c.estado] = Number(c.total)

  const total =
    f.estados.length > 0
      ? f.estados.reduce((s, e) => s + (contagens[e] ?? 0), 0)
      : ESTADOS.reduce((s, e) => s + contagens[e], 0)

  const ids = linhas.map((l) => l.user_id)
  const evidencias = ids.length
    ? await prisma.$queryRawUnsafe<
        {
          user_id: string
          origem: Origem
          produto: string
          fonte: string
          em: Date | null
        }[]
      >(
        `SELECT user_id, origem, produto, fonte, em
           FROM user_origins
          WHERE user_id = ANY($1::text[])
          ORDER BY em DESC NULLS LAST`,
        ids
      )
    : []

  const porUsuario = new Map<string, Evidencia[]>()
  for (const e of evidencias) {
    const lista = porUsuario.get(e.user_id) ?? []
    lista.push({ origem: e.origem, produto: e.produto, fonte: e.fonte, em: iso(e.em) })
    porUsuario.set(e.user_id, lista)
  }

  const items: LinhaPublico[] = linhas.map((l) => {
    const evs = porUsuario.get(l.user_id) ?? []
    return {
      userId: l.user_id,
      email: l.email,
      nome: l.nome,
      whatsapp: l.whatsapp,
      idioma: l.idioma,
      estado: l.estado,
      contaCriadaEm: iso(l.conta_criada_em),
      assinaturaStatus: l.assinatura_status,
      assinaturaDesde: iso(l.assinatura_desde),
      primeiroAcessoEm: iso(l.first_access_at),
      ultimoSinalEm: iso(l.ultimo_sinal_em),
      ultimaFonte: l.ultima_fonte,
      diasSemSinal: l.dias_sem_sinal,
      origens: [...new Set(evs.map((e) => e.origem))],
      evidencias: evs
    }
  })

  return { total, contagens, corte: f.corte, items }
}
