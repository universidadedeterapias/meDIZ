const DEFAULT_TEMPLATE = `Olá {{nome}}! 👋

Obrigado pela sua compra. Suas credenciais para acessar a biblioteca:

🔗 Acesso: {{url}}
📧 E-mail: {{email}}
🔑 Senha temporária: {{senha}}

⚠️ No primeiro acesso será solicitada a troca da senha por uma de sua escolha.

Qualquer dúvida, é só chamar!`

export function buildWhatsAppCredentialsMessage(params: {
  nome: string
  email: string
  senha: string
}): string {
  const template =
    process.env.WHATSAPP_CREDENTIALS_TEMPLATE?.replace(/\\n/g, '\n') ??
    DEFAULT_TEMPLATE

  const url =
    process.env.PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://mediz.app'

  return template
    .replace(/\{\{nome\}\}/g, params.nome)
    .replace(/\{\{email\}\}/g, params.email)
    .replace(/\{\{senha\}\}/g, params.senha)
    .replace(/\{\{url\}\}/g, url.replace(/\/$/, ''))
}
