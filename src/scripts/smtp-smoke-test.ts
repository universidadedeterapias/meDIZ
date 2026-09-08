/**
 * Envio de teste dos dois e-mails transacionais, usando o template e o mailer reais.
 *
 * Nao toca no banco de proposito: o DATABASE_URL aponta para producao, e conferir
 * formatacao nao justifica gravar token la. O link vai com um token falso — serve
 * para ver o visual e a entrega, nao para clicar.
 *
 * Execucao: npx tsx src/scripts/smtp-smoke-test.ts <destinatario>
 */

import 'dotenv/config'
import { isEmailConfigured, sendEmail } from '@/lib/email/mailer'
import { buildPasswordResetEmail } from '@/lib/email/templates/password-reset'
import { buildSignupConfirmationEmail } from '@/lib/email/templates/signup-confirmation'

async function main() {
  const to = process.argv[2]
  if (!to) {
    console.error('Uso: npx tsx src/scripts/smtp-smoke-test.ts <destinatario>')
    process.exit(1)
  }

  if (!isEmailConfigured()) {
    console.error('SMTP nao configurado — confira SMTP_HOST/USER/PASS/FROM no .env')
    process.exit(1)
  }

  console.log(`Remetente: ${process.env.SMTP_FROM}`)
  console.log(`Destino:   ${to}\n`)

  const tokenFalso = 'TOKEN-DE-TESTE-NAO-FUNCIONA'
  const baseUrl = 'https://mediz.app'

  const reset = buildPasswordResetEmail({
    language: 'pt-BR',
    nome: 'Edgar',
    resetUrl: `${baseUrl}/reset?token=${tokenFalso}&email=${encodeURIComponent(to)}`,
    expiryMinutes: 30
  })

  const signup = buildSignupConfirmationEmail({
    language: 'pt-BR',
    nome: 'Edgar',
    confirmationUrl: `${baseUrl}/confirm-signup?token=${tokenFalso}&email=${encodeURIComponent(to)}`,
    expiryHours: 24
  })

  for (const [rotulo, msg] of [
    ['redefinicao de senha', reset],
    ['confirmacao de cadastro', signup]
  ] as const) {
    const ok = await sendEmail({ to, subject: msg.subject, html: msg.html, text: msg.text })
    console.log(`${ok ? 'OK   ' : 'FALHA'} ${rotulo} — "${msg.subject}"`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
