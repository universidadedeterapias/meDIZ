import type { LanguageCode } from '@/i18n/config'

/**
 * E-mail de redefinicao de senha, nos quatro idiomas do app.
 *
 * Os textos moram aqui e nao em `src/i18n/messages` de proposito: aquele dicionario
 * e carregado no bundle do cliente, e o corpo do e-mail so existe no servidor.
 */

type Copy = {
  subject: string
  greeting: (nome: string | null) => string
  intro: string
  cta: string
  fallback: string
  expiry: (minutos: number) => string
  ignore: string
  signature: string
}

const COPY: Record<LanguageCode, Copy> = {
  'pt-BR': {
    subject: 'Redefinição de senha — meDIZ!',
    greeting: (nome) => (nome ? `Olá, ${nome}!` : 'Olá!'),
    intro: 'Recebemos um pedido para redefinir a senha da sua conta meDIZ!.',
    cta: 'Redefinir minha senha',
    fallback: 'Se o botão não funcionar, copie e cole este endereço no navegador:',
    expiry: (min) => `Este link vale por ${min} minutos.`,
    ignore:
      'Se não foi você que pediu, pode ignorar esta mensagem — sua senha continua a mesma.',
    signature: 'Equipe meDIZ!'
  },
  'pt-PT': {
    subject: 'Redefinição da palavra-passe — meDIZ!',
    greeting: (nome) => (nome ? `Olá, ${nome}!` : 'Olá!'),
    intro:
      'Recebemos um pedido para redefinir a palavra-passe da sua conta meDIZ!.',
    cta: 'Redefinir a minha palavra-passe',
    fallback: 'Se o botão não funcionar, copie e cole este endereço no navegador:',
    expiry: (min) => `Esta ligação é válida durante ${min} minutos.`,
    ignore:
      'Se não foi o utilizador que pediu, pode ignorar esta mensagem — a palavra-passe mantém-se.',
    signature: 'Equipa meDIZ!'
  },
  en: {
    subject: 'Password reset — meDIZ!',
    greeting: (nome) => (nome ? `Hi, ${nome}!` : 'Hi!'),
    intro: 'We received a request to reset the password for your meDIZ! account.',
    cta: 'Reset my password',
    fallback: "If the button doesn't work, copy and paste this address into your browser:",
    expiry: (min) => `This link is valid for ${min} minutes.`,
    ignore:
      "If you didn't request this, you can ignore this message — your password stays the same.",
    signature: 'The meDIZ! team'
  },
  es: {
    subject: 'Restablecer contraseña — meDIZ!',
    greeting: (nome) => (nome ? `¡Hola, ${nome}!` : '¡Hola!'),
    intro:
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta meDIZ!.',
    cta: 'Restablecer mi contraseña',
    fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
    expiry: (min) => `Este enlace es válido por ${min} minutos.`,
    ignore:
      'Si no fuiste tú, puedes ignorar este mensaje: tu contraseña sigue igual.',
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

export function buildPasswordResetEmail(input: {
  language: LanguageCode
  nome: string | null
  resetUrl: string
  expiryMinutes: number
}): { subject: string; html: string; text: string } {
  const copy = COPY[input.language] ?? COPY['pt-BR']
  const saudacao = copy.greeting(input.nome?.trim() || null)

  const text = [
    saudacao,
    '',
    copy.intro,
    '',
    input.resetUrl,
    '',
    copy.expiry(input.expiryMinutes),
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
            <a href="${input.resetUrl}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:bold;">${escapeHtml(copy.cta)}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#52525b;">${escapeHtml(copy.fallback)}</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${input.resetUrl}" style="color:#6d28d9;">${input.resetUrl}</a></p>
          <p style="margin:0 0 4px;font-size:13px;color:#52525b;">${escapeHtml(copy.expiry(input.expiryMinutes))}</p>
          <p style="margin:0 0 24px;font-size:13px;color:#52525b;">${escapeHtml(copy.ignore)}</p>
          <p style="margin:0;font-size:13px;color:#52525b;">${escapeHtml(copy.signature)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject: copy.subject, html, text }
}
