/**
 * Monta o telefone no formato que o WhatsApp espera: DDI + numero, sem pontuacao.
 *
 * Existe porque as plataformas entregam o numero partido de jeitos diferentes e
 * nenhuma promete o que cada pedaco contem. A Hotmart manda `checkout_phone_code`
 * e `checkout_phone`, mas o segundo campo muitas vezes ja vem com o DDD dentro —
 * concatenar sem olhar produzia `32` + `32988037060` = `3232988037060`, com o DDD
 * repetido, e o envio falhava. A Stone parte em `country_code`/`area_code`/`number`
 * e tem o mesmo risco.
 *
 * A regra e sempre a mesma: so acrescenta um pedaco se ele ainda nao estiver la.
 *
 * Nasceu assumindo Brasil, e por isso devolvia `null` para qualquer numero que
 * nao tivesse 10 ou 11 digitos — o que jogava fora todo comprador estrangeiro, que
 * ficava sem WhatsApp nenhum. Agora o pais decide o DDI, e o tamanho valido e o
 * daquele pais. O Brasil continua sendo o padrao de quem nao informa nada.
 */

const DDI_PADRAO = '55'

/**
 * DDI por pais (ISO 3166-1 alfa-2).
 *
 * Nao pretende cobrir o mundo: cobre onde a meDIZ vende. Pais fora desta lista
 * ainda funciona quando o numero ja chega com o DDI dentro — o que se perde e so
 * a capacidade de adivinhar o DDI a partir do pais.
 */
const DDI_POR_PAIS: Record<string, string> = {
  BR: '55',
  PT: '351',
  US: '1',
  CA: '1',
  GB: '44',
  UK: '44',
  IE: '353',
  ES: '34',
  MX: '52',
  AR: '54',
  CL: '56',
  CO: '57',
  PE: '51',
  UY: '598',
  PY: '595',
  BO: '591',
  EC: '593',
  VE: '58',
  CR: '506',
  PA: '507',
  DO: '1',
  IT: '39',
  FR: '33',
  DE: '49',
  CH: '41',
  AT: '43',
  NL: '31',
  BE: '32',
  AO: '244',
  MZ: '258',
  CV: '238',
  JP: '81',
  AU: '61'
}

/** Sem contar o DDI. Larga de proposito: numero nacional varia muito por pais. */
const MIN_DIGITOS_LOCAIS = 6
const MAX_DIGITOS_LOCAIS = 14

function apenasDigitos(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\D/g, '')
}

export type PartesTelefone = {
  /** Codigo do pais. Sem ele, sai do `paisIso`; sem os dois, assume Brasil. */
  ddi?: unknown
  /** DDD. Pode vir vazio quando o numero ja o carrega. */
  ddd?: unknown
  /** Numero, com ou sem DDD embutido. */
  numero?: unknown
  /**
   * ISO do pais do comprador (`BR`, `ES`, `US`...).
   *
   * E o unico sinal confiavel de DDI que as plataformas dao: o campo de "codigo"
   * do telefone as vezes traz o DDD, as vezes o codigo do pais, e nao ha como
   * saber qual olhando so para ele.
   */
  paisIso?: unknown
}

/**
 * Devolve o telefone pronto para envio, ou `null` quando o que sobrou nao tem
 * cara de telefone.
 *
 * Devolver `null` e melhor que devolver algo torto: quem consome trata a ausencia
 * (manda so o e-mail), enquanto um numero invalido vira erro no meio do envio.
 */
export function montarTelefone(partes: PartesTelefone): string | null {
  const numero = apenasDigitos(partes.numero)
  if (!numero) return null

  const pais = String(partes.paisIso ?? '')
    .trim()
    .toUpperCase()
  const ddi =
    apenasDigitos(partes.ddi) || DDI_POR_PAIS[pais] || DDI_PADRAO

  return ddi === DDI_PADRAO
    ? montarBrasil(apenasDigitos(partes.ddd), numero)
    : montarExterior(ddi, apenasDigitos(partes.ddd), numero)
}

/**
 * Brasil: DDI + DDD + numero, com DDD obrigatorio e tamanho fixo.
 *
 * Continua exatamente como era. O telefone brasileiro tem formato fechado (10
 * digitos no fixo, 11 no movel), entao aqui da para ser rigoroso — e vale ser,
 * porque e de longe o volume maior.
 */
function montarBrasil(ddd: string, numeroBruto: string): string | null {
  let numero = numeroBruto

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

  return `${DDI_PADRAO}${comDdd}`
}

/**
 * Fora do Brasil: DDI + o que vier, com faixa de tamanho larga.
 *
 * Nao da para validar tamanho por pais sem virar uma tabela de numeracao mundial,
 * e recusar numero valido e pior que deixar passar um torto: o torto falha no
 * envio e aparece no log, o recusado some sem ninguem saber que existiu.
 *
 * O cuidado que importa e nao duplicar o DDI. O campo de "codigo" das plataformas
 * costuma trazer justamente o codigo do pais quando a compra e de fora, e ai
 * `ddd` e `ddi` sao a mesma coisa.
 */
function montarExterior(
  ddi: string,
  dddBruto: string,
  numeroBruto: string
): string | null {
  // Ja veio internacional: devolve como esta.
  if (
    numeroBruto.startsWith(ddi) &&
    numeroBruto.length >= ddi.length + MIN_DIGITOS_LOCAIS
  ) {
    return numeroBruto.length <= ddi.length + MAX_DIGITOS_LOCAIS
      ? numeroBruto
      : null
  }

  // `ddd` que na verdade e o codigo do pais nao entra de novo.
  const ddd = dddBruto === ddi ? '' : dddBruto

  const local =
    ddd && !numeroBruto.startsWith(ddd) ? `${ddd}${numeroBruto}` : numeroBruto

  if (local.length < MIN_DIGITOS_LOCAIS || local.length > MAX_DIGITOS_LOCAIS) {
    return null
  }

  return `${ddi}${local}`
}
