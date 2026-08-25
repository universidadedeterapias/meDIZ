import nodemailer, { type Transporter } from 'nodemailer'
import { logger } from '@/lib/logger'

/**
 * Envio de e-mail transacional pelo SMTP da Hostinger.
 *
 * Fala direto com o SMTP em vez de passar pelo n8n, como faz o aviso de compra.
 * A diferenca e o que esta em jogo: o aviso de compra pode esperar a fila, o link
 * de redefinicao de senha e caminho de autenticacao — se o n8n cair, ninguem
 * entra na propria conta. Uma dependencia a menos entre a pessoa e o login.
 */

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

let transporter: Transporter | null = null

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  )
}

function getTransporter(): Transporter {
  if (transporter) return transporter

  const port = Number(process.env.SMTP_PORT ?? 465)

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 fala TLS desde o primeiro byte; 587 abre em claro e sobe com STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // A rota fica esperando este envio para responder a quem clicou. Sem teto, um
    // SMTP lento vira uma tela girando ate o limite da funcao.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  })

  return transporter
}

/**
 * `false` quando o envio falhou — quem chama decide o que dizer ao usuario.
 * Nunca lanca: erro de SMTP e problema nosso, e nao deve derrubar a requisicao.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.error(
      'SMTP nao configurado — e-mail nao enviado',
      undefined,
      '[email/mailer]'
    )
    return false
  }

  try {
    await getTransporter().sendMail({
      // A Hostinger recusa remetente diferente da conta autenticada, entao o
      // SMTP_FROM tem de ser a propria caixa de SMTP_USER (com nome amigavel).
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    })
    return true
  } catch (error) {
    // Sem o destinatario na mensagem: o log nao precisa saber quem pediu senha.
    logger.error(
      'Falha ao enviar e-mail',
      error instanceof Error ? error : undefined,
      '[email/mailer]'
    )
    return false
  }
}
