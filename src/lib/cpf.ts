/** Normaliza CPF para apenas dígitos (11 caracteres). */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/** Formata CPF enquanto digita: 000.000.000-00 */
export function formatCpfInput(value: string): string {
  const digits = normalizeCpf(value)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(cpf[10])
}

export function formatCpfDisplay(value: string | null | undefined): string {
  const digits = normalizeCpf(value ?? '')
  if (digits.length !== 11) return value?.trim() || '—'
  return formatCpfInput(digits)
}
