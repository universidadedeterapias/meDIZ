import { hash } from 'bcryptjs'

const AMBIGUOUS = new Set(['0', 'O', 'o', 'l', '1', 'I', 'i'])
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** Senha padrão para usuários criados via webhook de compra (Hotmart/Stone). */
export const DEFAULT_TEMPORARY_PASSWORD = 'Mudar123'

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
