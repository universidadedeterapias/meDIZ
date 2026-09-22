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
  AU: '61',
  LU: '352'
}

/**
 * Nome do pais, como as planilhas exportadas trazem (`Portugal`, `Estados
 * Unidos`, `Suíça`), para o ISO de `DDI_POR_PAIS`. Chave ja sem acento e em
 * maiusculas — ver `isoDoPais`.
 */
const ISO_POR_NOME: Record<string, string> = {
  BRASIL: 'BR',
  BRAZIL: 'BR',
  PORTUGAL: 'PT',
  'ESTADOS UNIDOS': 'US',
  'UNITED STATES': 'US',
  EUA: 'US',
  CANADA: 'CA',
  'REINO UNIDO': 'GB',
  'UNITED KINGDOM': 'GB',
  IRLANDA: 'IE',
  ESPANHA: 'ES',
  MEXICO: 'MX',
  ARGENTINA: 'AR',
  CHILE: 'CL',
  COLOMBIA: 'CO',
  PERU: 'PE',
  URUGUAI: 'UY',
  PARAGUAI: 'PY',
  BOLIVIA: 'BO',
  EQUADOR: 'EC',
  VENEZUELA: 'VE',
  'COSTA RICA': 'CR',
  PANAMA: 'PA',
  'REPUBLICA DOMINICANA': 'DO',
  ITALIA: 'IT',
  FRANCA: 'FR',
  ALEMANHA: 'DE',
  SUICA: 'CH',
  AUSTRIA: 'AT',
  HOLANDA: 'NL',
  'PAISES BAIXOS': 'NL',
  BELGICA: 'BE',
  ANGOLA: 'AO',
  MOCAMBIQUE: 'MZ',
  'CABO VERDE': 'CV',
  JAPAO: 'JP',
  AUSTRALIA: 'AU',
  LUXEMBURGO: 'LU'
}

/** Aceita o ISO (`PT`) ou o nome do pais (`Portugal`, `Suíça`). */
function isoDoPais(v: unknown): string {
  const texto = String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
  return ISO_POR_NOME[texto] ?? texto
}

/**
 * Italia e a excecao: o `0` do fixo faz parte do numero internacional
 * (+39 06...). Nos outros paises daqui, o `0` inicial e so o prefixo de
 * discagem nacional (`090-...` no Japao, `0401...` na Australia) e sai.
 */
const DDI_MANTEM_ZERO = new Set(['39'])

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

  const pais = isoDoPais(partes.paisIso)
  const ddi =
    apenasDigitos(partes.ddi) || DDI_POR_PAIS[pais] || DDI_PADRAO

  return ddi === DDI_PADRAO
    ? montarBrasil(apenasDigitos(partes.ddd), numero)
    : montarExterior(ddi, apenasDigitos(partes.ddd), numero)
}

/**
 * Brasil: DDI + DDD + numero, com DDD obrigatorio e tamanho fixo.
 *
 * O telefone brasileiro tem formato fechado (10 digitos no fixo, 11 no movel),
 * entao aqui da para ser rigoroso — e vale ser, porque e de longe o volume maior.
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

  // Nenhum DDD comeca com 0, e todo numero de 11 digitos e celular, que comeca
  // com 9. Sem estas duas checagens, um estrangeiro cadastrado como Brasil
  // (`17347540202`, dos EUA; `07388 839482`, do Reino Unido) ganhava 55 e ia
  // para o numero de outra pessoa.
  if (comDdd.startsWith('0')) return null
  if (comDdd.length === 11 && comDdd[2] !== '9') return null

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

  const comDdd =
    ddd && !numeroBruto.startsWith(ddd) ? `${ddd}${numeroBruto}` : numeroBruto
  const local = DDI_MANTEM_ZERO.has(ddi) ? comDdd : comDdd.replace(/^0+/, '')

  if (local.length < MIN_DIGITOS_LOCAIS || local.length > MAX_DIGITOS_LOCAIS) {
    return null
  }

  return `${ddi}${local}`
}

/**
 * Como o telefone e gravado em `User.whatsapp`: brasileiro so com digitos
 * (`5511987654321`), estrangeiro com `+` na frente (`+12035263231`).
 *
 * O `+` e o que permite reler o numero sem adivinhar. Um americano sem ele,
 * `12035263231`, tem os mesmos 11 digitos de um celular de Sao Paulo sem DDI, e
 * quem le a coluna depois (a onda de reativacao, que normaliza de novo o que
 * esta gravado) acrescentaria 55 e mandaria para o numero de outra pessoa.
 */
export function telefoneParaCadastro(partes: PartesTelefone): string | null {
  const telefone = montarTelefone(partes)
  if (!telefone) return null
  // Nenhum DDI alem do brasileiro comeca com 55, entao o prefixo basta para
  // saber de onde o numero e.
  return telefone.startsWith(DDI_PADRAO) ? telefone : `+${telefone}`
}

/**
 * Le de volta um `User.whatsapp` e devolve DDI + numero, so digitos.
 *
 * A coluna mistura o que cada cadastro gravou: mascarado sem DDI (`(11)
 * 93728-4567`, a maioria), ja normalizado (`5511...`), estrangeiro marcado por
 * `telefoneParaCadastro` (`+351...`) ou digitado com `00`. Na duvida continua
 * Brasil, que e o padrao de quem nao informa nada.
 */
export function telefoneDoCadastro(gravado: unknown): string | null {
  const texto = String(gravado ?? '').trim()
  const digitos = apenasDigitos(texto)
  if (!digitos) return null

  const internacional = texto.startsWith('+') || digitos.startsWith('00')
  const semPrefixo = digitos.replace(/^00/, '')

  // Mais de 11 digitos sem 55 nao pode ser brasileiro (sem DDI sao 10 ou 11),
  // entao ja veio com o DDI de fora — e o que os webhooks de compra gravavam
  // antes do `+` existir.
  const estrangeiroSemMarca =
    /^\d+$/.test(texto) && semPrefixo.length > 11 && !semPrefixo.startsWith(DDI_PADRAO)

  if ((internacional || estrangeiroSemMarca) && !semPrefixo.startsWith(DDI_PADRAO)) {
    const tamanhoOk =
      semPrefixo.length >= MIN_DIGITOS_LOCAIS + 1 &&
      semPrefixo.length <= MAX_DIGITOS_LOCAIS + 1
    return tamanhoOk ? semPrefixo : null
  }

  return montarTelefone({ numero: semPrefixo })
}
