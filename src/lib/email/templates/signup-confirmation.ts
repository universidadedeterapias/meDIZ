import type { LanguageCode } from '@/i18n/config'

/**
 * E-mail de confirmacao de cadastro, nos quatro idiomas do app.
 *
 * Mesmo link que vai pelo WhatsApp: o token e um so, e o primeiro canal que a
 * pessoa abrir queima os dois. Espelha `password-reset.ts` de proposito — os
 * textos moram aqui e nao em `src/i18n/messages` porque aquele dicionario e
 * carregado no bundle do cliente, e o corpo do e-mail so existe no servidor.
 */

type Copy = {
  subject: string
  greeting: (nome: string | null) => string
  intro: string
  cta: string
  fallback: string
  expiry: (horas: number) => string
  ignore: string
  signature: string
}

const COPY: Record<LanguageCode, Copy> = {
  'pt-BR': {
    subject: 'Confirme seu cadastro — meDIZ!',
    greeting: (nome) => (nome ? `Olá, ${nome}!` : 'Olá!'),
    intro:
      'Falta um passo para ativar sua conta meDIZ!. Toque no botão abaixo para confirmar seu cadastro.',
    cta: 'Confirmar meu cadastro',
    fallback: 'Se o botão não funcionar, copie e cole este endereço no navegador:',
    expiry: (h) => `Este link vale por ${h} horas.`,
    ignore:
      'Se não foi você que se cadastrou, pode ignorar esta mensagem — nenhuma conta será ativada.',
    signature: 'Equipe meDIZ!'
  },
  'pt-PT': {
    subject: 'Confirme o seu registo — meDIZ!',
    greeting: (nome) => (nome ? `Olá, ${nome}!` : 'Olá!'),
    intro:
      'Falta um passo para ativar a sua conta meDIZ!. Toque no botão abaixo para confirmar o seu registo.',
    cta: 'Confirmar o meu registo',
    fallback: 'Se o botão não funcionar, copie e cole este endereço no navegador:',
    expiry: (h) => `Esta ligação é válida durante ${h} horas.`,
    ignore:
      'Se não foi o utilizador que se registou, pode ignorar esta mensagem — nenhuma conta será ativada.',
    signature: 'Equipa meDIZ!'
  },
  en: {
    subject: 'Confirm your account — meDIZ!',
    greeting: (nome) => (nome ? `Hi, ${nome}!` : 'Hi!'),
    intro:
      'One step left to activate your meDIZ! account. Tap the button below to confirm your registration.',
    cta: 'Confirm my account',
    fallback: "If the button doesn't work, copy and paste this address into your browser:",
    expiry: (h) => `This link is valid for ${h} hours.`,
    ignore:
      "If you didn't sign up, you can ignore this message — no account will be activated.",
    signature: 'The meDIZ! team'
  },
  es: {
    subject: 'Confirma tu registro — meDIZ!',
    greeting: (nome) => (nome ? `¡Hola, ${nome}!` : '¡Hola!'),
    intro:
      'Falta un paso para activar tu cuenta meDIZ!. Toca el botón de abajo para confirmar tu registro.',
    cta: 'Confirmar mi registro',
    fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
    expiry: (h) => `Este enlace es válido por ${h} horas.`,
    ignore:
      'Si no fuiste tú quien se registró, puedes ignorar este mensaje: no se activará ninguna cuenta.',
    signature: 'Equipo meDIZ!'
  }
}

/** Fecha a porta para HTML vindo do nome cadastrado pelo proprio usuario. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildSignupConfirmationEmail(input: {
  language: LanguageCode
  nome: string | null
  confirmationUrl: string
  expiryHours: number
}): { subject: string; html: string; text: string } {
  const copy = COPY[input.language] ?? COPY['pt-BR']
  const saudacao = copy.greeting(input.nome?.trim() || null)

  const text = [
    saudacao,
    '',
    copy.intro,
    '',
    input.confirmationUrl,
    '',
    copy.expiry(input.expiryHours),
    copy.ignore,
    '',
    copy.signature
  ].join('\n')

  // Tabela e estilo inline porque cliente de e-mail nao le <style> nem flexbox.
  const html = `<!doctype html>
<html lang="${input.language}">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:24px;font-weight:bold;color:#6d28d9;">meDIZ!</p>
          <p style="margin:0 0 16px;font-size:16px;">${escapeHtml(saudacao)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${escapeHtml(copy.intro)}</p>
          <p style="margin:0 0 24px;">
            <a href="${input.confirmationUrl}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;">${escapeHtml(copy.cta)}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#52525b;">${escapeHtml(copy.fallback)}</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${input.confirmationUrl}" style="color:#6d28d9;">${input.confirmationUrl}</a></p>
          <p style="margin:0 0 4px;font-size:13px;color:#52525b;">${escapeHtml(copy.expiry(input.expiryHours))}</p>
          <p style="margin:0 0 24px;font-size:13px;color:#52525b;">${escapeHtml(copy.ignore)}</p>
          <p style="margin:0;font-size:13px;color:#52525b;">${escapeHtml(copy.signature)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject: copy.subject, html, text }
}
