import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { isValidCpf, normalizeCpf } from '@/lib/cpf'
import { phoneVariants } from '@/lib/customer/phone-match'
import {
  buildTrackingUrl,
  carrierLabel,
  detectCarrier
} from '@/lib/shipping/carriers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Rastreio do livro impresso, para o atendimento.
 *
 * Substitui a consulta que lia a planilha da grafica. A planilha continua sendo a
 * interface da grafica; ela so deixa de ser a fonte da resposta ao cliente, e com
 * isso somem dois defeitos que vinham dela:
 *
 * - So aceitava CPF, porque e a unica identificacao que a planilha guarda. Aqui o
 *   despacho tem e-mail (obrigatorio e indexado), telefone e usuario, entao a
 *   consulta aceita os tres e junta o que cada um achar.
 * - "Postado" era deduzido de existir texto numa celula, e `#N/A` ou `CANCELADO`
 *   viravam codigo de rastreio. Aqui o status e coluna, com maquina de estados
 *   propria, e a confirmacao do proprio comprador tambem conta.
 *
 * O contrato de saida e o das tools do atendimento: `status` + `dados` +
 * `mensagem`. A `mensagem` e para log, nao para o cliente ler — quem escreve o
 * texto e quem conhece o canal.
 */

const bodySchema = z
  .object({
    email: z.string().trim().optional().nullable(),
    cpf: z.string().trim().optional().nullable(),
    whatsapp: z.string().trim().optional().nullable()
  })
  .refine((v) => !!(v.email || v.cpf || v.whatsapp), {
    message: 'Informe email, cpf ou whatsapp'
  })

/**
 * Status do despacho traduzido para o que o atendimento precisa decidir.
 *
 * `aguardando_postagem` vira `em_separacao` de proposito: o nome interno descreve
 * a fila da grafica, e o cliente que ouve "aguardando postagem" entende que
 * alguem esqueceu de postar.
 */
const SITUACAO: Record<string, string> = {
  aguardando_postagem: 'em_separacao',
  postado: 'postado',
  em_transito: 'em_transito',
  entregue: 'entregue',
  devolvido: 'devolvido',
  problema: 'problema'
}

function cpfLimpo(valor: string | null | undefined): string | null {
  if (!valor) return null
  const digitos = normalizeCpf(valor)
  if (!digitos || digitos.length > 11) return null
  // Celula numerica come o zero da frente, e o cliente digita os 11. Completar de
  // volta e seguro porque quem decide no fim e o digito verificador.
  const cpf = digitos.padStart(11, '0')
  return isValidCpf(cpf) ? cpf : null
}

/**
 * Todo jeito de chegar no despacho a partir do que o atendimento informou.
 *
 * CPF e telefone nao estao no despacho como chave propria — o CPF nem existe na
 * tabela. Os dois chegam pelo cadastro: acha a pessoa, e do id e do e-mail dela
 * saem os despachos. Por isso a busca e uma uniao, e nao uma cascata: quem
 * informou e-mail errado e CPF certo continua sendo encontrado.
 */
async function chavesDeBusca(entrada: {
  email?: string | null
  cpf?: string | null
  whatsapp?: string | null
}): Promise<{
  emails: Set<string>
  userIds: Set<string>
  telefones: Set<string>
  cpfInvalido: boolean
}> {
  const emails = new Set<string>()
  const userIds = new Set<string>()
  const telefones = new Set<string>()

  if (entrada.email) {
    const email = normalizeLibraryEmail(entrada.email)
    if (email) emails.add(email)
  }

  const cpf = cpfLimpo(entrada.cpf)
  const cpfInvalido = !!entrada.cpf && !cpf

  if (cpf) {
    const users = await prisma.user.findMany({
      where: { cpf },
      select: { id: true, email: true }
    })
    for (const user of users) {
      userIds.add(user.id)
      emails.add(normalizeLibraryEmail(user.email))
    }
  }

  if (entrada.whatsapp) {
    const variantes = phoneVariants(entrada.whatsapp)
    for (const v of variantes) telefones.add(v)

    if (variantes.length > 0) {
      // O telefone gravado no cadastro carrega formatos de varias epocas, entao a
      // comparacao e contra as variantes, nunca por sufixo: casar sufixo juntaria
      // numeros de DDDs e paises diferentes, e um falso positivo aqui mostra o
      // pedido de uma pessoa para outra.
      const users = await prisma.user.findMany({
        where: { whatsapp: { in: variantes } },
        select: { id: true, email: true }
      })
      for (const user of users) {
        userIds.add(user.id)
        emails.add(normalizeLibraryEmail(user.email))
      }
    }
  }

  return { emails, userIds, telefones, cpfInvalido }
}

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'SHIPMENT_TRACKING_SECRET')
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        status: 'erro',
        dados: null,
        mensagem: 'Corpo da requisição não é JSON válido.'
      },
      { status: 400 }
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    // Chamada sem identificacao e defeito de quem chamou, e nao ausencia de
    // compra. Responder `nao_encontrado` aqui faria o atendimento dizer ao
    // cliente que ele nao comprou por causa de um erro nosso.
    return NextResponse.json(
      {
        status: 'erro',
        dados: null,
        mensagem: 'Informe email, cpf ou whatsapp.'
      },
      { status: 400 }
    )
  }

  try {
    const { emails, userIds, telefones, cpfInvalido } = await chavesDeBusca(
      parsed.data
    )

    const or: Record<string, unknown>[] = []
    if (emails.size > 0) or.push({ email: { in: [...emails] } })
    if (userIds.size > 0) or.push({ userId: { in: [...userIds] } })
    if (telefones.size > 0) or.push({ telefone: { in: [...telefones] } })

    const despachos =
      or.length === 0
        ? []
        : await prisma.bookShipment.findMany({
            where: { OR: or },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              status: true,
              trackingCode: true,
              carrier: true,
              lastStatusLabel: true,
              postedAt: true,
              deliveredAt: true,
              deliveryConfirmedAt: true,
              createdAt: true,
              externalTransactionId: true
            }
          })

    if (despachos.length === 0) {
      return NextResponse.json({
        status: 'nao_encontrado',
        dados: { despachos: [], total: 0 },
        mensagem: cpfInvalido
          ? 'CPF informado não é válido e nenhum outro dado encontrou despacho.'
          : 'Nenhum despacho encontrado para os dados informados.'
      })
    }

    const lista = despachos.map((d) => {
      // A URL sai do codigo, e nao da coluna: o codigo e o fato, a URL e conclusao
      // tirada dele. Quando a gente descobre quem entrega um formato, deduzir na
      // leitura conserta inclusive quem foi gravado antes de a gente saber.
      const codigo = d.trackingCode?.trim() || null
      const transportadora = codigo ? detectCarrier(codigo) : null

      return {
        shipment_id: d.id,
        situacao: SITUACAO[d.status] ?? d.status,
        situacao_interna: d.status,
        codigo_rastreio: codigo,
        transportadora: transportadora?.id ?? d.carrier ?? null,
        transportadora_nome: transportadora
          ? transportadora.label
          : carrierLabel(d.carrier),
        link_rastreio: codigo ? buildTrackingUrl(codigo) : null,
        ultimo_status: d.lastStatusLabel,
        comprado_em: d.createdAt.toISOString(),
        postado_em: d.postedAt?.toISOString() ?? null,
        entregue_em: d.deliveredAt?.toISOString() ?? null,
        // A transportadora dizer que entregou sem ninguem confirmar e exatamente
        // o caso que o atendimento precisa olhar — por isso as duas datas saem.
        confirmado_pelo_cliente_em:
          d.deliveryConfirmedAt?.toISOString() ?? null,
        transaction_id: d.externalTransactionId
      }
    })

    const comCodigo = lista.filter((d) => d.codigo_rastreio)

    // Achou a compra mas a grafica ainda nao postou. E um estado normal, e nao
    // uma resposta vazia: sem dize-lo, o atendimento le o vazio como "voce nao
    // comprou" — e quem mais pergunta pelo rastreio e justamente quem acabou de
    // comprar e ainda nao tem codigo.
    if (comCodigo.length === 0) {
      return NextResponse.json({
        status: 'em_separacao',
        dados: { despachos: lista, total: lista.length, postados: 0 },
        mensagem: 'Compra encontrada, sem código de rastreio ainda.'
      })
    }

    return NextResponse.json({
      status: 'ok',
      dados: {
        despachos: lista,
        total: lista.length,
        postados: comCodigo.length
      },
      mensagem: 'Compra encontrada com código de rastreio.'
    })
  } catch (error) {
    logger.error(
      'Falha ao consultar rastreio',
      error instanceof Error ? error : undefined,
      '[shipments/consulta]'
    )
    // Falha tecnica nunca pode sair como "nao encontrei": vazio por falha e vazio
    // por inexistencia sao coisas opostas para quem esta do outro lado.
    return NextResponse.json(
      {
        status: 'erro',
        dados: null,
        mensagem: 'Não foi possível consultar o rastreio agora.'
      },
      { status: 500 }
    )
  }
}
