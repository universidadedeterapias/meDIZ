import { hash } from 'bcryptjs'

const AMBIGUOUS = new Set(['0', 'O', 'o', 'l', '1', 'I', 'i'])
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/**
 * Senha de primeiro acesso das contas criadas por compra.
 *
 * Fixa por decisão de produto: é o valor impresso nos e-mails de acesso disparados
 * pelo n8n, então precisa ser previsível. A conta fica bloqueada por
 * `mustResetPassword` até o usuário definir a própria senha (ver `requireAuth`),
 * o que limita a exposição à janela antes do primeiro login.
 */
export const DEFAULT_TEMPORARY_PASSWORD = 'mediz123'

export function generateTemporaryPassword(length = 10): string {
  let result = ''
  while (result.length < length) {
    const char = CHARSET[Math.floor(Math.random() * CHARSET.length)]
    if (!AMBIGUOUS.has(char)) {
      result += char
    }
  }
  return result
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10)
}
