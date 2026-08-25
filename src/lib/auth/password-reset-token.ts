import { createHash } from 'crypto'

/**
 * Token de redefinicao de senha guardado em `VerificationToken`.
 *
 * O `identifier` leva o prefixo `pwreset:` pelo mesmo motivo do `access-link:`:
 * a confirmacao de cadastro (`api/auth/signup`, `api/verify-signup`) grava com o
 * e-mail puro como identifier. Enquanto o pedido de senha usava o e-mail puro
 * tambem, o `deleteMany` que invalida o link anterior levava junto o token de
 * confirmacao de quem se cadastrou e ainda nao confirmou — a pessoa pedia senha
 * nova e perdia o link de confirmacao.
 */

const IDENTIFIER_PREFIX = 'pwreset:'

export function resetIdentifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`
}

/**
 * Identifiers aceitos ao consumir o token.
 *
 * O e-mail puro continua na lista por causa dos links ja emitidos pela rota
 * antiga, que gravava sem prefixo: eles valem por 30 minutos e nao podem quebrar
 * no deploy. Passada essa janela, sobra so o prefixado.
 *
 * Aceitar o e-mail puro nao abre porta para consumir um token de confirmacao de
 * cadastro: aquele guarda um UUID em texto e aqui a comparacao e sempre contra o
 * SHA-256 do que o usuario apresentou.
 */
export function acceptedResetIdentifiers(email: string): string[] {
  return [resetIdentifierFor(email), email]
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
