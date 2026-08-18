/**
 * Casamento de telefone entre o numero que o agente tem e o que esta gravado em
 * `User.whatsapp`.
 *
 * A coluna acumulou os formatos de vários fluxos ao longo do tempo: mascarado
 * `(11) 98765-4321`, so digitos `11987654321`, com DDI `5511987654321`, sem o
 * nono digito `1187654321`, e numeros de fora do Brasil como `00351918072811`.
 *
 * A estrategia e gerar as variantes equivalentes do numero buscado e comparar por
 * IGUALDADE com a coluna normalizada — nunca por sufixo. Comparar sufixo casaria
 * numeros de DDDs e paises diferentes, e um falso positivo aqui mostra os dados de
 * um cliente para outro.
 */

const BR_COUNTRY_CODE = '55'

/** Menos que isso nao identifica ninguem com seguranca. */
const MIN_DIGITS = 8

/**
 * Formas equivalentes do mesmo telefone: com e sem DDI, com e sem o nono digito.
 * Devolve lista vazia quando o valor nao tem digitos suficientes.
 */
export function phoneVariants(raw: string | null | undefined): string[] {
  const original = (raw ?? '').replace(/\D/g, '')
  if (original.length < MIN_DIGITS) return []

  const out = new Set<string>()
  const add = (value: string) => {
    if (value.length >= MIN_DIGITS) out.add(value)
  }

  add(original)

  // `00` e prefixo de discagem internacional — `00351...` e o mesmo que `351...`.
  const semPrefixo = original.startsWith('00') ? original.slice(2) : original
  add(semPrefixo)

  // Numero brasileiro: 12 ou 13 digitos com DDI, 10 ou 11 sem.
  const temDdiBr =
    (semPrefixo.length === 12 || semPrefixo.length === 13) &&
    semPrefixo.startsWith(BR_COUNTRY_CODE)

  const nacional = temDdiBr ? semPrefixo.slice(BR_COUNTRY_CODE.length) : semPrefixo

  if (temDdiBr) {
    add(nacional)
  } else if (nacional.length === 10 || nacional.length === 11) {
    add(`${BR_COUNTRY_CODE}${nacional}`)
  }

  // Nono digito: celulares brasileiros aparecem com e sem ele conforme a epoca do
  // cadastro. So se aplica a numeros de 10 ou 11 digitos.
  if (nacional.length === 11 && nacional[2] === '9') {
    const semNono = `${nacional.slice(0, 2)}${nacional.slice(3)}`
    add(semNono)
    add(`${BR_COUNTRY_CODE}${semNono}`)
  } else if (nacional.length === 10) {
    const comNono = `${nacional.slice(0, 2)}9${nacional.slice(2)}`
    add(comNono)
    add(`${BR_COUNTRY_CODE}${comNono}`)
  }

  return [...out]
}
