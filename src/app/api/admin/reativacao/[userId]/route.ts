import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

/**
 * O historico de uma pessoa: o que ela tem, quando recebeu, e o que fez.
 *
 * A lista principal mostra so o ULTIMO rastro, e um numero sozinho engana.
 * "Sumiu ha 94 dias" le de um jeito para quem usou tres vezes numa semana e
 * parou, e de outro para quem entrou uma vez e nunca mais — e sao decisoes de
 * campanha diferentes. A sequencia e o que deixa o operador discordar da
 * classificacao antes de mandar mensagem.
 *
 * Carregado sob demanda, quando a linha abre: puxar isto para as 50 linhas da
 * pagina seriam 350 consultas para uma informacao que quase sempre ninguem olha.
 */

/** Teto do que cabe numa leitura. Quem precisa de mais que isto quer um export,
 *  e nao uma linha expandida. */
const TETO_ATIVIDADE = 40

type Atividade = { tipo: string; em: Date | null; detalhe: string | null }
type Acesso = {
  produto: string | null
  tipo: string | null
  source: string | null
  liberado_em: Date | null
}
type Aviso = {
  kind: string
  status: string
  provider: string | null
  created_at: Date | null
  sent_at: Date | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'userId ausente' }, { status: 400 })
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true }
  })
  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  try {
    const [atividade, acessos, avisos, tags] = await Promise.all([
      // Uma linha por acao, e nao o maximo: e a sequencia que informa.
      prisma.$queryRawUnsafe<Atividade[]>(
        `SELECT 'conversa' AS tipo, "createdAt" AS em,
                COALESCE(agent, 'agente') || ' · ' ||
                COALESCE(message_count, 0)::text || ' mensagem(ns)' AS detalhe
           FROM "ChatSession" WHERE "userId" = $1
         UNION ALL
         SELECT 'download_biblioteca', created_at, file_label
           FROM pdf_downloads WHERE user_id = $1
         UNION ALL
         SELECT 'descoberta', created_at, event_type
           FROM discovery_events WHERE user_id = $1
         UNION ALL
         SELECT 'checkpoint_conversa', available_at, trigger
           FROM conversation_events WHERE user_id = $1
         UNION ALL
         SELECT 'pasta_sintoma', "createdAt", name
           FROM "SymptomFolder" WHERE "userId" = $1
         UNION ALL
         SELECT 'evento_jornada', created_at, event_name
           FROM journey_events WHERE user_id = $1
         UNION ALL
         SELECT 'lembrete', "createdAt", title
           FROM reminders WHERE "userId" = $1
          ORDER BY em DESC NULLS LAST
          LIMIT ${TETO_ATIVIDADE}`,
        userId
      ),
      // O que a pessoa tem hoje, e desde quando. Casado por e-mail porque
      // entitlement nasceu antes de existir conta.
      prisma.$queryRawUnsafe<Acesso[]>(
        `SELECT cp.title AS produto, cp.permission_key::text AS tipo,
                e.source, e.created_at AS liberado_em
           FROM product_entitlements e
           LEFT JOIN catalog_products cp ON cp.id = e.catalog_product_id
          WHERE lower(e.email) = lower($1)
          ORDER BY e.created_at DESC`,
        usuario.email
      ),
      // Quando a pessoa foi avisada de que tinha acesso — e se o aviso saiu.
      // Acesso liberado com aviso `failed` explica silencio sem culpar o cliente.
      prisma.$queryRawUnsafe<Aviso[]>(
        `SELECT kind, status, provider, created_at, sent_at
           FROM access_deliveries
          WHERE lower(email) = lower($1)
          ORDER BY created_at DESC
          LIMIT 10`,
        usuario.email
      ),
      prisma.userTag.findMany({
        where: { userId },
        include: { tag: true },
        orderBy: { criadoEm: 'desc' }
      })
    ])

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.name,
        contaCriadaEm: usuario.createdAt?.toISOString() ?? null
      },
      atividade: atividade.map((a) => ({
        tipo: a.tipo,
        em: a.em ? a.em.toISOString() : null,
        detalhe: a.detalhe
      })),
      acessos: acessos.map((a) => ({
        produto: a.produto,
        tipo: a.tipo,
        source: a.source,
        liberadoEm: a.liberado_em ? a.liberado_em.toISOString() : null
      })),
      avisos: avisos.map((a) => ({
        kind: a.kind,
        status: a.status,
        provider: a.provider,
        criadoEm: a.created_at ? a.created_at.toISOString() : null,
        enviadoEm: a.sent_at ? a.sent_at.toISOString() : null
      })),
      tags: tags.map((t) => ({
        id: t.tag.id,
        nome: t.tag.nome,
        cor: t.tag.cor,
        origem: t.origem,
        aplicadaEm: t.criadoEm.toISOString()
      })),
      truncado: atividade.length === TETO_ATIVIDADE
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { error: 'Falha ao montar o histórico.', detalhe: msg },
      { status: 500 }
    )
  }
}
