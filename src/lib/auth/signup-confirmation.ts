import { randomUUID } from 'crypto'
import { getCurrentLanguage } from '@/i18n/server'
import { sendEmail } from '@/lib/email/mailer'
import { buildSignupConfirmationEmail } from '@/lib/email/templates/signup-confirmation'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import {
  isWhatsAppConfigured,
  sendSignupConfirmation,
  simulateWhatsAppSend
} from '@/lib/whatsappService'

/**
 * Link de confirmacao de cadastro pelos dois canais.
 *
 * Antes so existia o WhatsApp, e o telefone era obrigatorio no cadastro so por
 * causa disso: sem Z-API no ar, ninguem ativava a conta. O e-mail entra ao lado,
 * nao no lugar — vale o link que a pessoa abrir primeiro, porque o token e um so.
 *
 * Junta o que `api/auth/signup` e `api/verify-signup` faziam duplicado, cada um
 * com sua copia da geracao de token e do fallback de simulacao.
 */

const EXPIRY_HOURS = 24

export type SignupConfirmationResult = {
  emailSent: boolean
  whatsappSent: boolean
  /** Algum canal entregou. E o que decide se a pessoa pode seguir para a tela de espera. */
  sent: boolean
  expiresAt: Date
}

function resolveBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:3000'
  )
}

async function enviarWhatsApp(
  whatsapp: string,
  nome: string,
  confirmationUrl: string,
  language: string
): Promise<boolean> {
  if (isWhatsAppConfigured()) {
    return await sendSignupConfirmation(whatsapp, nome, confirmationUrl, language)
  }

  // A simulacao existe para desenvolver sem Z-API. Em producao ela nao pode
  // contar como envio: era assim que o cadastro dizia "confira seu WhatsApp"
  // sobre uma mensagem que nunca saiu.
  if (process.env.NODE_ENV === 'production') {
    logger.error(
      'Z-API nao configurada — confirmacao de cadastro nao foi pelo WhatsApp',
      undefined,
      '[auth/signup-confirmation]'
    )
    return false
  }

  const messages: Record<string, string> = {
    'pt-BR': `Link de confirmação: ${confirmationUrl}`,
    'pt-PT': `Ligação de confirmação: ${confirmationUrl}`,
    en: `Confirmation link: ${confirmationUrl}`,
    es: `Enlace de confirmación: ${confirmationUrl}`
  }
  simulateWhatsAppSend(whatsapp, messages[language] || messages['pt-BR'])
  return true
}

/**
 * Cria o token e dispara os dois canais. Nunca lanca: falha de entrega e problema
 * nosso, e quem chama decide o que dizer com base em qual canal saiu.
 *
 * O token nasce mesmo sem telefone — o e-mail sozinho ja ativa a conta.
 */
export async function sendSignupConfirmationLink(input: {
  email: string
  nome: string | null
  whatsapp: string | null
}): Promise<SignupConfirmationResult> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.verificationToken.create({
    data: { identifier: input.email, token, expires: expiresAt }
  })

  const confirmationUrl = `${resolveBaseUrl()}/confirm-signup?token=${token}&email=${encodeURIComponent(input.email)}`
  const language = await getCurrentLanguage()
  const nome = input.nome?.trim() || input.email.split('@')[0]

  // Em paralelo: um canal lento nao pode segurar o outro, e a rota fica esperando
  // este envio para responder a quem acabou de se cadastrar.
  const [emailSent, whatsappSent] = await Promise.all([
    (async () => {
      const { subject, html, text } = buildSignupConfirmationEmail({
        language,
        nome,
        confirmationUrl,
        expiryHours: EXPIRY_HOURS
      })
      return await sendEmail({ to: input.email, subject, html, text })
    })(),
    input.whatsapp
      ? enviarWhatsApp(input.whatsapp, nome, confirmationUrl, language)
      : Promise.resolve(false)
  ])

  if (!emailSent && !whatsappSent) {
    logger.error(
      'Confirmacao de cadastro nao saiu por nenhum canal',
      undefined,
      '[auth/signup-confirmation]'
    )
  }

  return {
    emailSent,
    whatsappSent,
    sent: emailSent || whatsappSent,
    expiresAt
  }
}
