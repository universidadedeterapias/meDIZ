export function formatPhone(value: string): string {
  // Remove tudo que não for número
  const digits = value.replace(/\D/g, '')

  // Aplica o formato (00) 00000-0000
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2') // Área
    .replace(/(\d{5})(\d)/, '$1-$2') // Hífen
    .slice(0, 15) // Limita tamanho máximo
}
