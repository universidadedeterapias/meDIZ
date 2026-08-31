// src/lib/formatPhone.ts
import { AsYouType, type CountryCode } from 'libphonenumber-js/min'

/**
 * Formata um telefone enquanto o usuário digita.
 *
 * Sem "+" na frente, assume o DDI do `defaultCountry` (Brasil, por padrão) —
 * é o caso comum, e ninguém deveria precisar digitar "+55" pro próprio DDD.
 * Com "+" na frente, o DDI digitado manda: `+351 965 314 854` formata como
 * português, não é forçado a virar um número brasileiro truncado.
 */
export function formatPhone(
  value: string,
  defaultCountry: CountryCode = 'BR'
): string {
  if (!value) return ''

  const international = value.trim().startsWith('+')
  const formatter = new AsYouType(international ? undefined : defaultCountry)
  return formatter.input(value)
}
