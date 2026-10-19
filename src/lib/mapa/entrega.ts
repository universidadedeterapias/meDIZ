import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createAccessLink } from '@/lib/auth/access-link'
import { isEmailConfigured, sendEmail } from '@/lib/email/mailer'
import {
  buildMapaProntoEmail,
  buildMapaResgateEmail
} from '@/lib/email/templates/mapa-pronto'

/**
 * Entrega do Mapa pago: e-mail daqui, WhatsApp pelo n8n.
 *
 * A entrega e assincrona por natureza: o Pix vale 3 dias, entao a pessoa pode
 * pagar com a pagina fechada. O link leva a /mapa/<token>; quem nunca definiu
 * senha recebe link magico (mesma regra do `deliverAccess`: quem ja tem senha
 * nao ganha credencial nova por e-mail).
 *
 * Nunca lanca: o Mapa ja esta pago e desbloqueado no banco. Falha fica em
 * `entrega_status`/`entrega_erro` e o webhook repetido tenta de novo.
 */

const LOG = '[mapa/entrega]'

function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://mediz.app'
  )
}

async function linkPara(userId: string, destino: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustResetPassword: true }
  })
  if (user?.mustResetPassword === false) {
    return new URL(destino, baseUrl()).toString()
  }
  const link = await createAccessLink(userId, { redirectTo: destino })
  return link.url
}

/** POST no webhook do n8n que manda o WhatsApp (Story 7.7). */
async function avisarN8n(corpo: Record<string, unknown>): Promise<string | null> {
  const url = process.env.N8N_MAPA_ENTREGA_WEBHOOK_URL?.trim()
  if (!url) return 'N8N_MAPA_ENTREGA_WEBHOOK_URL não configurada'
  // Mesmo token do gerador: o webhook manda WhatsApp com link, não pode ficar aberto.
  const token = process.env.MAPA_WEBHOOK_TOKEN?.trim()
  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000)
    })
    return resposta.ok ? null : `n8n respondeu HTTP ${resposta.status}`
  } catch (error) {
    return error instanceof Error ? error.message : 'Falha de rede'
  }
}

async function mandarEmail(
  para: string,
  mensagem: { subject: string; html: string; text: string }
): Promise<string | null> {
  if (!isEmailConfigured()) return 'SMTP não configurado'
  const ok = await sendEmail({ to: para, ...mensagem })
  return ok ? null : 'Falha no envio do e-mail'
}

export async function entregarMapa(mapaId: string): Promise<void> {
  try {
    const mapa = await prisma.mapaOrigem.findUnique({
      where: { id: mapaId },
      include: { user: { select: { email: true, whatsapp: true, name: true } } }
    })
    if (!mapa?.userId || !mapa.user || !mapa.paidAt) return

    const destino = `/mapa/${mapa.publicToken}`
    const url = await linkPara(mapa.userId, destino)

    const erroEmail = await mandarEmail(
      mapa.user.email,
      buildMapaProntoEmail({ nome: mapa.nome, sintoma: mapa.sintoma, url })
    )
    const erroWhats = await avisarN8n({
      tipo: 'mapa_pronto',
      // Chave do portao de envio: a mesma entrega tentada de novo nao sai duas vezes.
      delivery_id: `mapa:${mapa.id}`,
      mapa_id: mapa.id,
      user_id: mapa.userId,
      nome: mapa.nome,
      email: mapa.user.email,
      // O numero da conversa com a Aline vem primeiro: e la que a pessoa espera.
      telefone: mapa.telefone ?? mapa.user.whatsapp ?? null,
      sintoma: mapa.sintoma,
      frase_forte: mapa.fraseForte,
      link: url,
      transaction_id: mapa.transactionId
    })

    const erros = [erroEmail && `e-mail: ${erroEmail}`, erroWhats && `whatsapp: ${erroWhats}`]
      .filter(Boolean)
      .join(' · ')

    await prisma.mapaOrigem.update({
      where: { id: mapa.id },
      data: {
        // Basta um canal para a pessoa achar o Mapa; o erro do outro fica registrado.
        entregaStatus: erroEmail && erroWhats ? 'falhou' : 'enviado',
        entregaErro: erros ? erros.slice(0, 500) : null,
        entregueEm: erroEmail && erroWhats ? null : new Date()
      }
    })
    if (erros) logger.warn(`Entrega do Mapa ${mapa.id} com falha — ${erros}`, LOG)
  } catch (error) {
    logger.error(
      'Falha ao entregar o Mapa',
      error instanceof Error ? error : undefined,
      LOG
    )
  }
}

/** Venda sem Mapa vinculado: avisa e leva para o resgate. */
export async function entregarResgate(creditoId: string): Promise<void> {
  try {
    const credito = await prisma.mapaCredito.findUnique({
      where: { id: creditoId },
      include: { user: { select: { email: true, whatsapp: true, name: true } } }
    })
    if (!credito) return

    const url = await linkPara(credito.userId, '/mapa/resgatar')
    const erroEmail = await mandarEmail(
      credito.user.email,
      buildMapaResgateEmail({ nome: credito.user.name, url })
    )
    const erroWhats = await avisarN8n({
      tipo: 'mapa_resgate',
      delivery_id: `mapa-credito:${credito.id}`,
      user_id: credito.userId,
      nome: credito.user.name,
      email: credito.user.email,
      telefone: credito.user.whatsapp ?? null,
      link: url,
      transaction_id: credito.transactionId
    })
    if (erroEmail || erroWhats) {
      logger.warn(
        `Entrega do crédito ${credito.id} com falha — ${[erroEmail, erroWhats].filter(Boolean).join(' · ')}`,
        LOG
      )
    }
  } catch (error) {
    logger.error(
      'Falha ao entregar o crédito do Mapa',
      error instanceof Error ? error : undefined,
      LOG
    )
  }
}
