import type { MapaOrigem } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { grantPurchaseAccess } from '@/lib/purchases/grant-purchase'
import { chaveTelefone, extrairTokensDoPayload } from './identidade'
import { entregarMapa, entregarResgate } from './entrega'

/**
 * Venda do Mapa aprovada: achar o Mapa, dar dono, desbloquear e entregar.
 *
 * A conta nasce pelo `grantPurchaseAccess` — o mesmo caminho de toda venda —,
 * sem liberar produto nenhum. O que NAO se usa e o `deliverAccess`: ele grava
 * `User.accessMessageAt`, que e a trava de "uma mensagem de acesso por pessoa,
 * para sempre". Passar o Mapa por ali tiraria do comprador o aviso do livro
 * numa compra futura e o colocaria nos Despertadores, que partem dessa coluna.
 * A entrega do Mapa e propria (`entregarMapa`).
 *
 * Como achar o Mapa da venda, do mais forte para o mais fraco:
 * 1. token (`mo...`) em qualquer lugar do payload — o `?src=` do checkout;
 * 2. o telefone do checkout bate com o `?id=` da Aline, Mapa pronto e sem dono
 *    dos ultimos 4 dias (o Pix vale 3);
 * 3. nenhum dos dois: vira credito de 1 Mapa na conta, resgatado em
 *    /mapa/resgatar. Ninguem paga e fica sem.
 */

const LOG = '[mapa/pagamento]'
const JANELA_TELEFONE_MS = 4 * 24 * 60 * 60 * 1000

export type VendaMapa = {
  provider: string
  transactionId: string
  email: string
  nome: string | null
  cpf: string | null
  telefone: string | null
  purchaseEventId: string | null
  payload: unknown
}

export type ResultadoVendaMapa =
  | { tipo: 'desbloqueado'; mapaId: string; vinculo: 'token' | 'telefone'; repetido: boolean }
  | { tipo: 'credito'; creditoId: string; repetido: boolean }

async function acharPorToken(payload: unknown): Promise<MapaOrigem | null> {
  const tokens = extrairTokensDoPayload(payload)
  if (tokens.length === 0) return null
  return prisma.mapaOrigem.findFirst({
    where: { publicToken: { in: tokens }, status: 'pronto', paidAt: null },
    orderBy: { createdAt: 'desc' }
  })
}

async function acharPorTelefone(telefone: string | null): Promise<MapaOrigem | null> {
  const chave = chaveTelefone(telefone)
  if (!chave) return null

  // Poucos candidatos (janela de 4 dias, telefone indexado): a comparacao fina
  // de DDD + 8 ultimos digitos fica aqui, e nao num LIKE no banco.
  const ultimos8 = chave.slice(-8)
  const candidatos = await prisma.mapaOrigem.findMany({
    where: {
      telefone: { endsWith: ultimos8 },
      status: 'pronto',
      paidAt: null,
      createdAt: { gte: new Date(Date.now() - JANELA_TELEFONE_MS) }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  return candidatos.find((m) => chaveTelefone(m.telefone) === chave) ?? null
}

function ehConflitoDeUnicidade(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

export async function processarVendaMapa(venda: VendaMapa): Promise<ResultadoVendaMapa> {
  const email = normalizeLibraryEmail(venda.email)

  // Webhook repetido da mesma venda: o trabalho ja foi feito. So refaz a
  // entrega se ela tinha falhado — a repeticao vira uma tentativa a mais.
  const jaPago = await prisma.mapaOrigem.findFirst({
    where: { provider: venda.provider, transactionId: venda.transactionId }
  })
  if (jaPago) {
    if (jaPago.entregaStatus !== 'enviado') await entregarMapa(jaPago.id)
    return { tipo: 'desbloqueado', mapaId: jaPago.id, vinculo: (jaPago.vinculo as 'token' | 'telefone') ?? 'token', repetido: true }
  }
  const jaCredito = await prisma.mapaCredito.findFirst({
    where: { provider: venda.provider, transactionId: venda.transactionId }
  })
  if (jaCredito) return { tipo: 'credito', creditoId: jaCredito.id, repetido: true }

  const conta = await grantPurchaseAccess({
    email,
    nome: venda.nome,
    cpf: venda.cpf,
    telefone: venda.telefone,
    sourceCatalogProductId: '',
    externalTransactionId: venda.transactionId,
    source: 'stone',
    // O Mapa nao libera nada da biblioteca: so a conta e o proprio Mapa.
    grantProductIds: []
  })

  const porToken = await acharPorToken(venda.payload)
  const mapa = porToken ?? (await acharPorTelefone(venda.telefone))
  const vinculo = porToken ? 'token' : 'telefone'

  if (mapa) {
    // Condicional em `paidAt: null`: duas vendas nao desbloqueiam o mesmo
    // Mapa. A segunda (raro: pagou duas vezes) cai no credito abaixo.
    const { count } = await prisma.mapaOrigem
      .updateMany({
        where: { id: mapa.id, paidAt: null },
        data: {
          userId: conta.userId,
          paidAt: new Date(),
          provider: venda.provider,
          transactionId: venda.transactionId,
          vinculo
        }
      })
      .catch((error: unknown) => {
        // Outro webhook desta venda gravou primeiro (unique provider+transacao).
        if (ehConflitoDeUnicidade(error)) return { count: -1 }
        throw error
      })

    if (count === -1) {
      const vencedor = await prisma.mapaOrigem.findFirst({
        where: { provider: venda.provider, transactionId: venda.transactionId },
        select: { id: true }
      })
      return { tipo: 'desbloqueado', mapaId: vencedor?.id ?? mapa.id, vinculo, repetido: true }
    }

    if (count === 1) {
      logger.info(`Mapa ${mapa.id} desbloqueado por ${vinculo}`, LOG)
      await entregarMapa(mapa.id)
      return { tipo: 'desbloqueado', mapaId: mapa.id, vinculo, repetido: false }
    }
  }

  // Sem Mapa para desbloquear: credito de 1 Mapa na conta.
  try {
    const credito = await prisma.mapaCredito.create({
      data: {
        userId: conta.userId,
        provider: venda.provider,
        transactionId: venda.transactionId,
        purchaseEventId: venda.purchaseEventId
      }
    })
    logger.warn(
      `Venda do Mapa sem Mapa vinculado (${venda.provider}/${venda.transactionId}) — crédito ${credito.id}`,
      LOG
    )
    await entregarResgate(credito.id)
    return { tipo: 'credito', creditoId: credito.id, repetido: false }
  } catch (error) {
    if (!ehConflitoDeUnicidade(error)) throw error
    const existente = await prisma.mapaCredito.findFirst({
      where: { provider: venda.provider, transactionId: venda.transactionId },
      select: { id: true }
    })
    if (!existente) throw error
    return { tipo: 'credito', creditoId: existente.id, repetido: true }
  }
}

/**
 * Resgate: a pessoa logada usa um credito para ficar com um Mapa pronto e sem
 * dono. Atomico nos dois lados — credito so se usa uma vez, Mapa so ganha um
 * dono.
 */
export async function resgatarComCredito(input: {
  userId: string
  mapaId: string
}): Promise<{ ok: true } | { ok: false; motivo: 'sem_credito' | 'mapa_indisponivel' }> {
  return prisma.$transaction(async (tx) => {
    const credito = await tx.mapaCredito.findFirst({
      where: { userId: input.userId, usadoEm: null },
      orderBy: { createdAt: 'asc' }
    })
    if (!credito) return { ok: false as const, motivo: 'sem_credito' as const }

    const usado = await tx.mapaCredito.updateMany({
      where: { id: credito.id, usadoEm: null },
      data: { usadoEm: new Date(), mapaId: input.mapaId }
    })
    if (usado.count !== 1) return { ok: false as const, motivo: 'sem_credito' as const }

    const mapa = await tx.mapaOrigem.updateMany({
      where: { id: input.mapaId, status: 'pronto', paidAt: null },
      data: {
        userId: input.userId,
        paidAt: new Date(),
        provider: credito.provider,
        transactionId: credito.transactionId,
        vinculo: 'credito'
      }
    })
    if (mapa.count !== 1) {
      throw new MapaIndisponivel()
    }
    return { ok: true as const }
  }).catch((error: unknown) => {
    if (error instanceof MapaIndisponivel) {
      return { ok: false as const, motivo: 'mapa_indisponivel' as const }
    }
    throw error
  })
}

class MapaIndisponivel extends Error {}

/**
 * Assinante nao paga o Mapa: o Mapa que ele gerou e liberado na hora, sem
 * checkout e sem credito. Fica marcado como `provider/vinculo = 'assinatura'`
 * (sem transacao) para nao entrar na conta das vendas do Mapa.
 *
 * Nao dispara a entrega por e-mail/WhatsApp: quem libera e o proprio assinante,
 * com o Mapa aberto na tela e guardado na Biblioteca.
 */
export async function liberarParaAssinante(input: {
  userId: string
  mapaId: string
}): Promise<boolean> {
  const liberado = await prisma.mapaOrigem.updateMany({
    where: { id: input.mapaId, status: 'pronto', paidAt: null },
    data: {
      userId: input.userId,
      paidAt: new Date(),
      provider: 'assinatura',
      vinculo: 'assinatura'
    }
  })
  return liberado.count === 1
}
