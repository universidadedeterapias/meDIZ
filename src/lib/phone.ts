/**
 * Monta o telefone brasileiro no formato que a Z-API espera: DDI + DDD + numero,
 * sem pontuacao.
 *
 * Existe porque as plataformas entregam o numero partido de jeitos diferentes e
 * nenhuma promete o que cada pedaco contem. A Hotmart manda `checkout_phone_code`
 * e `checkout_phone`, mas o segundo campo muitas vezes ja vem com o DDD dentro —
 * concatenar sem olhar produzia `32` + `32988037060` = `3232988037060`, com o DDD
 * repetido, e o envio falhava. A Stone parte em `country_code`/`area_code`/`number`
 * e tem o mesmo risco.
 *
 * A regra e sempre a mesma: so acrescenta um pedaco se ele ainda nao estiver la.
 */

const DDI_PADRAO = '55'

function apenasDigitos(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\D/g, '')
}

export type PartesTelefone = {
  /** Codigo do pais. Sem ele, assume Brasil. */
  ddi?: unknown
  /** DDD. Pode vir vazio quando o numero ja o carrega. */
  ddd?: unknown
  /** Numero, com ou sem DDD embutido. */
  numero?: unknown
}

/**
 * Devolve o telefone pronto para envio, ou `null` quando o que sobrou nao tem
 * tamanho de telefone brasileiro valido.
 *
 * Devolver `null` e melhor que devolver algo torto: quem consome trata a ausencia
 * (manda so o e-mail), enquanto um numero invalido vira erro no meio do envio.
 */
export function montarTelefoneBR(partes: PartesTelefone): string | null {
  const ddi = apenasDigitos(partes.ddi) || DDI_PADRAO
  const ddd = apenasDigitos(partes.ddd)
  let numero = apenasDigitos(partes.numero)

  if (!numero) return null

  // Numero ja completo com DDI: nao ha o que montar.
  if (numero.startsWith(DDI_PADRAO) && numero.length >= 12) {
    return numero.length <= 13 ? numero : null
  }

  // O DDD ja estava dentro do numero — acrescentar de novo e o bug que este
  // modulo existe para evitar.
  if (ddd && numero.startsWith(ddd) && numero.length > ddd.length + 7) {
    numero = numero.slice(ddd.length)
  }

  // Sem DDD separado, o numero precisa carrega-lo: 10 digitos (fixo) ou 11 (movel).
  const comDdd = ddd ? `${ddd}${numero}` : numero
  if (comDdd.length !== 10 && comDdd.length !== 11) return null

  return `${ddi}${comDdd}`
}
