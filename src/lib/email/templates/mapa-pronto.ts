/**
 * E-mail "teu Mapa esta pronto" (Mapa da Origem Emocional).
 *
 * So pt-BR: o Mapa e vendido no WhatsApp brasileiro. Mesmo esqueleto de
 * `signup-confirmation.ts` (tabela + estilo inline, porque cliente de e-mail
 * nao le <style>), na cor do produto.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const COR = '#585bef'

function montar(input: {
  subject: string
  linhas: string[]
  cta: string
  url: string
  rodape: string[]
}): { subject: string; html: string; text: string } {
  const text = [
    ...input.linhas,
    '',
    `${input.cta}: ${input.url}`,
    '',
    ...input.rodape,
    '',
    'Prof. Paulo Barbosa · meDIZ!'
  ].join('\n')

  const paragrafos = input.linhas
    .map(
      (l) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;">${escapeHtml(l)}</p>`
    )
    .join('\n          ')
  const rodape = input.rodape
    .map((l) => `<p style="margin:0 0 6px;font-size:13px;color:#52525b;">${escapeHtml(l)}</p>`)
    .join('\n          ')

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:22px;font-weight:bold;color:${COR};">meDIZ!</p>
          <p style="margin:0 0 20px;font-size:12px;font-weight:bold;letter-spacing:1px;color:${COR};">MAPA DA ORIGEM EMOCIONAL</p>
          ${paragrafos}
          <p style="margin:10px 0 24px;">
            <a href="${input.url}" style="display:inline-block;background:${COR};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:bold;">${escapeHtml(input.cta)}</a>
          </p>
          <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#52525b;">Se o botão não abrir: <a href="${input.url}" style="color:${COR};">${input.url}</a></p>
          ${rodape}
          <p style="margin:18px 0 0;font-size:13px;color:#52525b;">Prof. Paulo Barbosa · meDIZ!</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject: input.subject, html, text }
}

export function buildMapaProntoEmail(input: {
  nome: string
  sintoma: string
  url: string
}): { subject: string; html: string; text: string } {
  return montar({
    subject: `${input.nome}, teu Mapa da Origem Emocional está pronto`,
    linhas: [
      `${input.nome}, teu Mapa sobre "${input.sintoma}" está pronto.`,
      'Leia devagar. Com caneta. Marque tudo que te fizer parar.'
    ],
    cta: 'Abrir meu Mapa',
    url: input.url,
    rodape: [
      'Ele fica guardado pra sempre na tua Biblioteca do meDIZ! — se perder este e-mail, está lá.'
    ]
  })
}

export function buildMapaResgateEmail(input: {
  nome: string | null
  url: string
}): { subject: string; html: string; text: string } {
  const nome = input.nome?.trim()
  return montar({
    subject: 'Teu Mapa da Origem Emocional está liberado',
    linhas: [
      nome ? `${nome}, teu pagamento foi confirmado.` : 'Teu pagamento foi confirmado.',
      'Toque no botão para abrir o teu Mapa. Se ele ainda não aparecer, é só responder as perguntas de novo — ele sai em menos de 1 minuto, já liberado.'
    ],
    cta: 'Abrir meu Mapa',
    url: input.url,
    rodape: ['Teu Mapa fica guardado pra sempre na tua Biblioteca do meDIZ!.']
  })
}
