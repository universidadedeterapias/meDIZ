import { createHash, randomBytes, randomInt } from 'crypto'

/**
 * Identificadores do Mapa: o token publico, o aparelho que gerou, e como o
 * pagamento reencontra o Mapa.
 */

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789'
const TAMANHO_TOKEN = 24

/**
 * "mo" + 24 caracteres [a-z0-9].
 *
 * Sem `_` nem `-` de proposito: o token vai no link do checkout Guru e precisa
 * voltar intacto no payload da Stone, em um campo que ainda nao sabemos qual e
 * (Story 7.0). Minusculas e digitos sobrevivem a qualquer normalizacao de
 * parametro de URL, e o prefixo deixa achar o token por busca no payload
 * inteiro — sem depender do nome do campo.
 */
export function gerarTokenPublico(): string {
  let corpo = ''
  for (let i = 0; i < TAMANHO_TOKEN; i++) {
    corpo += ALFABETO[randomInt(ALFABETO.length)]
  }
  return `mo${corpo}`
}

const PADRAO_TOKEN = /^mo[a-z0-9]{24}$/
const PADRAO_TOKEN_NO_TEXTO = /(?<![a-z0-9])mo[a-z0-9]{24}(?![a-z0-9])/g

export function ehTokenPublico(valor: unknown): valor is string {
  return typeof valor === 'string' && PADRAO_TOKEN.test(valor)
}

/**
 * Tokens de Mapa em qualquer lugar do payload de pagamento.
 *
 * Varre o JSON inteiro em vez de um campo fixo porque a Guru repassa o
 * parametro do checkout para a Stone de um jeito que so a compra teste vai
 * mostrar (metadata, utm, URL de origem). Devolve todos os candidatos, sem
 * repetir; quem chama confere qual existe no banco.
 */
export function extrairTokensDoPayload(payload: unknown): string[] {
  let texto: string
  try {
    texto = JSON.stringify(payload ?? null).toLowerCase()
  } catch {
    return []
  }
  return [...new Set(texto.match(PADRAO_TOKEN_NO_TEXTO) ?? [])]
}

/** Cookie httpOnly que marca o aparelho que gerou o Mapa. */
export const COOKIE_DISPOSITIVO = 'mapa_dispositivo'

export function gerarSegredoDispositivo(): string {
  return randomBytes(32).toString('base64url')
}

export function hashDe(valor: string): string {
  return createHash('sha256').update(valor).digest('hex')
}

/**
 * So os digitos do telefone, sem DDI.
 *
 * O link da Aline traz E.164 sem simbolos ("5511999999999"); o checkout pode
 * trazer com ou sem 55, com ou sem o 9. Compara-se o DDD + os 8 ultimos
 * digitos, que e o que os dois lados sempre tem em comum.
 */
export function chaveTelefone(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null

  const semDdi =
    digitos.startsWith('55') && digitos.length >= 12 ? digitos.slice(2) : digitos
  if (semDdi.length < 10) return null

  const ddd = semDdi.slice(0, 2)
  const ultimos8 = semDdi.slice(-8)
  return `${ddd}${ultimos8}`
}

/** Normaliza o `?id=` da Aline para gravar: so digitos, ou null. */
export function normalizarTelefoneLink(valor: string | null | undefined): string | null {
  const digitos = (valor ?? '').replace(/\D/g, '')
  return digitos.length >= 10 && digitos.length <= 15 ? digitos : null
}
