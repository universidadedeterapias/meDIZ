import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { normalizeCpf } from '@/lib/cpf'
import { subscriptionGrantsPremiumAccess } from '@/lib/premiumUtils'
import { phoneVariants } from '@/lib/customer/phone-match'
import { Prisma } from '@prisma/client'

/**
 * Consulta de cliente para o atendimento.
 *
 * Substitui os nos Postgres que o n8n usa hoje para ler a tabela `User` direto.
 * Responde as perguntas que o agente realmente recebe: essa pessoa tem conta? ja
 * definiu senha? o que ela comprou? o aviso de acesso chegou a sair?
 *
 * Chaves, em ordem de confiabilidade:
 * - `email`: exato, e a unica presente em toda a base
 * - `cpf`: exato, mas so ~22% dos usuarios tem
 * - `whatsapp`: aproximado, porque a coluna acumulou varios formatos
 */

export type CustomerLookupQuery = {
  email?: string | null
  cpf?: string | null
  whatsapp?: string | null
}

export type CustomerLookupResult = {
  found: boolean
  /** Mais de um usuario bate com o telefone — o agente deve pedir e-mail ou CPF. */
  ambiguous: boolean
  matched_by: 'email' | 'cpf' | 'whatsapp' | null
  customer: {
    id: string
    nome: string | null
    email: string
    whatsapp: string | null
    cpf: string | null
    senha_definida: boolean
    email_verificado: boolean
    criado_em: string
  } | null
  produtos: {
    id: string
    titulo: string
    secao: string
    liberado_em: string
  }[]
  plano: { ativo: boolean; nome: string; expira_em: string } | null
  ultima_entrega: {
    status: string
    tipo: string
    tentativas: number
    enviado_em: string | null
    erro: string | null
  } | null
  /** Compras que chegaram mas ainda nao foram liberadas — produto sem mapeamento. */
  vendas_pendentes: {
    provider: string
    produto: string | null
    status: string
    recebida_em: string
  }[]
}

/** Só o suficiente para o agente confirmar identidade, sem repetir o dado inteiro. */
function maskTail(value: string | null, visible: number): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length <= visible) return digits
  return `${'•'.repeat(Math.min(digits.length - visible, 8))}${digits.slice(-visible)}`
}

const EMPTY: CustomerLookupResult = {
  found: false,
  ambiguous: false,
  matched_by: null,
  customer: null,
  produtos: [],
  plano: null,
  ultima_entrega: null,
  vendas_pendentes: []
}

type Candidate = { id: string; matchedBy: 'email' | 'cpf' | 'whatsapp' }

async function findByEmail(email: string): Promise<Candidate | null> {
  const row = await prisma.user.findUnique({
    where: { email: normalizeLibraryEmail(email) },
    select: { id: true }
  })
  return row ? { id: row.id, matchedBy: 'email' } : null
}

async function findByCpf(cpf: string): Promise<Candidate | null> {
  const digits = normalizeCpf(cpf)
  if (digits.length !== 11) return null
  const row = await prisma.user.findFirst({
    where: { cpf: digits },
    select: { id: true }
  })
  return row ? { id: row.id, matchedBy: 'cpf' } : null
}

/**
 * A normalizacao roda no Postgres porque a coluna guarda mascara: um `LIKE` sobre
 * o valor cru nao acha `(11) 98765-4321` procurando por `987654321`.
 */
async function findByWhatsapp(
  whatsapp: string
): Promise<{ candidates: Candidate[] }> {
  const variants = phoneVariants(whatsapp)
  if (variants.length === 0) return { candidates: [] }

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT id
    FROM "User"
    WHERE whatsapp IS NOT NULL
      AND regexp_replace(whatsapp, '[^0-9]', '', 'g') IN (${Prisma.join(variants)})
    LIMIT 20
  `

  return {
    candidates: rows.map((row) => ({
      id: row.id,
      matchedBy: 'whatsapp' as const
    }))
  }
}

export async function lookupCustomer(
  query: CustomerLookupQuery
): Promise<CustomerLookupResult> {
  let candidate: Candidate | null = null
  let ambiguous = false

  if (query.email?.trim()) {
    candidate = await findByEmail(query.email)
  }
  if (!candidate && query.cpf?.trim()) {
    candidate = await findByCpf(query.cpf)
  }
  if (!candidate && query.whatsapp?.trim()) {
    const { candidates } = await findByWhatsapp(query.whatsapp)
    if (candidates.length === 1) {
      candidate = candidates[0]
    } else if (candidates.length > 1) {
      ambiguous = true
    }
  }

  if (!candidate) {
    // Mesmo sem usuario, pode haver compra registrada esperando mapeamento — e a
    // diferenca entre "nao achei nada" e "sua compra chegou e esta em andamento".
    const pendentes = query.email?.trim()
      ? await findPendingSales(normalizeLibraryEmail(query.email))
      : []
    return { ...EMPTY, ambiguous, vendas_pendentes: pendentes }
  }

  const user = await prisma.user.findUnique({
    where: { id: candidate.id },
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      whatsapp: true,
      cpf: true,
      mustResetPassword: true,
      emailVerified: true,
      createdAt: true
    }
  })

  if (!user) return { ...EMPTY, ambiguous }

  const email = normalizeLibraryEmail(user.email)

  const [entitlements, subscription, delivery, pendentes] = await Promise.all([
    prisma.productEntitlement.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        catalogProduct: { select: { id: true, title: true, section: true } }
      }
    }),
    prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { currentPeriodEnd: 'desc' },
      select: {
        status: true,
        currentPeriodEnd: true,
        plan: { select: { name: true } }
      }
    }),
    prisma.accessDelivery.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        kind: true,
        attempts: true,
        sentAt: true,
        lastError: true
      }
    }),
    findPendingSales(email)
  ])

  return {
    found: true,
    ambiguous: false,
    matched_by: candidate.matchedBy,
    customer: {
      id: user.id,
      nome: user.fullName ?? user.name,
      email,
      whatsapp: maskTail(user.whatsapp, 4),
      cpf: maskTail(user.cpf, 3),
      senha_definida: !user.mustResetPassword,
      email_verificado: !!user.emailVerified,
      criado_em: user.createdAt.toISOString()
    },
    produtos: entitlements
      .filter((row) => row.catalogProduct)
      .map((row) => ({
        id: row.catalogProduct.id,
        titulo: row.catalogProduct.title,
        secao: row.catalogProduct.section,
        liberado_em: row.createdAt.toISOString()
      })),
    plano: subscription
      ? {
          ativo: subscriptionGrantsPremiumAccess({
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd
          }),
          nome: subscription.plan.name,
          expira_em: subscription.currentPeriodEnd.toISOString()
        }
      : null,
    ultima_entrega: delivery
      ? {
          status: delivery.status,
          tipo: delivery.kind,
          tentativas: delivery.attempts,
          enviado_em: delivery.sentAt?.toISOString() ?? null,
          erro: delivery.lastError
        }
      : null,
    vendas_pendentes: pendentes
  }
}

async function findPendingSales(email: string) {
  const rows = await prisma.purchaseEvent.findMany({
    where: { email, status: { in: ['pending_mapping', 'failed'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      provider: true,
      externalProductName: true,
      externalProductId: true,
      status: true,
      createdAt: true
    }
  })

  return rows.map((row) => ({
    provider: row.provider,
    produto: row.externalProductName ?? row.externalProductId,
    status: row.status,
    recebida_em: row.createdAt.toISOString()
  }))
}
