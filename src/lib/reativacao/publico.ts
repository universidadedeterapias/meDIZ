import { prisma } from '@/lib/prisma'
import {
  ESTADOS,
  PRODUTO_NAO_IDENTIFICADO,
  type Estado,
  type Evidencia,
  type Filtros,
  type LinhaPublico,
  type ResultadoPublico,
  type TagResumo
} from './tipos'

/**
 * A consulta do publico da reativacao. So servidor.
 *
 * A classificacao de PRODUTO nao mora aqui: mora na view `user_origins`
 * (`catalog_product_id`, resolvido direto de `purchase_events`/
 * `product_entitlements`). Duas copias da mesma regra divergem, e o filtro de
 * produto precisa rodar no banco para a contagem sair certa ANTES da
 * paginacao — e a contagem e o unico numero que impede disparo acidental em
 * volume.
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
  // Produto e catalog_product_id (texto), com um valor sintetico
  // (PRODUTO_NAO_IDENTIFICADO) para "compra sem produto resolvido" —
  // catalog_product_id fica NULL nesses casos, e "= ANY(...)" nunca bate com
  // NULL, entao esse balde precisa da propria clausula IS NULL.
  if (f.incluirProdutos.length > 0) {
    const semProduto = f.incluirProdutos.includes(PRODUTO_NAO_IDENTIFICADO)
    const ids = f.incluirProdutos.filter((p) => p !== PRODUTO_NAO_IDENTIFICADO)
    const clausulas: string[] = []
    if (ids.length > 0) {
      clausulas.push(`o.catalog_product_id = ANY(${proximo()}::text[])`)
      args.push(ids)
    }
    if (semProduto) clausulas.push('o.catalog_product_id IS NULL')
    if (clausulas.length > 0) {
      condicoes.push(
        `EXISTS (SELECT 1 FROM user_origins o
                  WHERE o.user_id = f.user_id AND (${clausulas.join(' OR ')}))`
      )
    }
  }
  if (f.excluirProdutos.length > 0) {
    const semProduto = f.excluirProdutos.includes(PRODUTO_NAO_IDENTIFICADO)
    const ids = f.excluirProdutos.filter((p) => p !== PRODUTO_NAO_IDENTIFICADO)
    const clausulas: string[] = []
    if (ids.length > 0) {
      clausulas.push(`o.catalog_product_id = ANY(${proximo()}::text[])`)
      args.push(ids)
    }
    if (semProduto) clausulas.push('o.catalog_product_id IS NULL')
    if (clausulas.length > 0) {
      condicoes.push(
        `NOT EXISTS (SELECT 1 FROM user_origins o
                      WHERE o.user_id = f.user_id AND (${clausulas.join(' OR ')}))`
      )
    }
  }
  if (f.incluirTags.length > 0) {
    condicoes.push(
      `EXISTS (SELECT 1 FROM user_tags ut
                WHERE ut.user_id = f.user_id AND ut.tag_id = ANY(${proximo()}::text[]))`
    )
    args.push(f.incluirTags)
  }
  if (f.excluirTags.length > 0) {
    condicoes.push(
      `NOT EXISTS (SELECT 1 FROM user_tags ut
                    WHERE ut.user_id = f.user_id AND ut.tag_id = ANY(${proximo()}::text[]))`
    )
    args.push(f.excluirTags)
  }
  // Atividade e sobre ultimo_sinal_em — nao confundir com o corte de dias, que
  // classifica estado. Aqui a pessoa escolhe uma janela de calendario de
  // proposito, ex.: "quem sumiu entre janeiro e marco".
  if (f.atividadeDesde) {
    condicoes.push(`f.ultimo_sinal_em >= ${proximo()}::timestamptz`)
    args.push(new Date(f.atividadeDesde))
  }
  if (f.atividadeAte) {
    condicoes.push(`f.ultimo_sinal_em <= ${proximo()}::timestamptz`)
    args.push(new Date(f.atividadeAte))
  }
  // Compra e sobre user_origins.em (data da compra ou liberacao), nao sobre
  // ultimo_sinal_em — uma compra de 2023 nao e "atividade recente".
  if (f.compraDesde || f.compraAte) {
    const sub: string[] = []
    if (f.compraDesde) {
      sub.push(`o.em >= ${proximo()}::timestamptz`)
      args.push(new Date(f.compraDesde))
    }
    if (f.compraAte) {
      sub.push(`o.em <= ${proximo()}::timestamptz`)
      args.push(new Date(f.compraAte))
    }
    condicoes.push(`EXISTS (SELECT 1 FROM user_origins o WHERE o.user_id = f.user_id AND ${sub.join(' AND ')})`)
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
          catalog_product_id: string | null
          produto: string
          fonte: string
          em: Date | null
        }[]
      >(
        `SELECT user_id, catalog_product_id, produto, fonte, em
           FROM user_origins
          WHERE user_id = ANY($1::text[])
          ORDER BY em DESC NULLS LAST`,
        ids
      )
    : []

  const tagsBrutas = ids.length
    ? await prisma.$queryRawUnsafe<
        { user_id: string; tag_id: string; nome: string; cor: string | null }[]
      >(
        `SELECT ut.user_id, t.id AS tag_id, t.nome, t.cor
           FROM user_tags ut
           JOIN tags t ON t.id = ut.tag_id
          WHERE ut.user_id = ANY($1::text[])
          ORDER BY t.nome`,
        ids
      )
    : []

  const porUsuario = new Map<string, Evidencia[]>()
  for (const e of evidencias) {
    const lista = porUsuario.get(e.user_id) ?? []
    lista.push({
      catalogProductId: e.catalog_product_id,
      produto: e.produto,
      fonte: e.fonte,
      em: iso(e.em)
    })
    porUsuario.set(e.user_id, lista)
  }

  const tagsPorUsuario = new Map<string, TagResumo[]>()
  for (const t of tagsBrutas) {
    const lista = tagsPorUsuario.get(t.user_id) ?? []
    lista.push({ id: t.tag_id, nome: t.nome, cor: t.cor })
    tagsPorUsuario.set(t.user_id, lista)
  }

  const items: LinhaPublico[] = linhas.map((l) => {
    const evs = porUsuario.get(l.user_id) ?? []

    // Dedup por catalogProductId — ou pelo texto, quando a compra nao
    // resolveu produto nenhum, porque nesse caso o id e sempre null e varias
    // evidencias sem produto nao podem colapsar numa so se os nomes crus
    // forem diferentes (duas plataformas, dois nomes, duas compras de fato).
    const produtosVistos = new Map<string, string>()
    for (const e of evs) {
      const chave = e.catalogProductId ?? `texto:${e.produto}`
      if (!produtosVistos.has(chave)) produtosVistos.set(chave, e.produto)
    }
    const produtos = [...produtosVistos.entries()].map(([chave, nome]) => ({
      id: chave.startsWith('texto:') ? null : chave,
      nome
    }))

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
      produtos,
      evidencias: evs,
      tags: tagsPorUsuario.get(l.user_id) ?? []
    }
  })

  return { total, contagens, corte: f.corte, items }
}
