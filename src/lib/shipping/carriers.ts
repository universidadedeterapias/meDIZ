/**
 * Reconhecimento da transportadora pelo formato do codigo de rastreio.
 *
 * A grafica nao posta tudo pelo mesmo canal. Numa mesma remessa vieram codigos
 * `AD803652820BR` (Correios) e `LG1017869652988...` (Loggi). Fixar "e Correios"
 * mandaria metade dos compradores para uma pagina que responde "objeto nao
 * encontrado" — pior que nao ter link nenhum, porque parece que o pedido sumiu.
 *
 * Por isso a transportadora e deduzida, e o codigo que nao bate com nada conhecido
 * fica sem URL em vez de ganhar uma errada.
 */

export type Carrier = {
  /** Guardado no banco. */
  id: string
  /** O que aparece na tela. */
  label: string
  /** Null quando nao existe pagina publica onde jogar o codigo. */
  buildUrl: ((code: string) => string) | null
}

const CARRIERS: Array<{ pattern: RegExp; carrier: Carrier }> = [
  {
    // Padrao universal dos Correios: 2 letras + 9 digitos + pais.
    pattern: /^[A-Z]{2}\d{9}[A-Z]{2}$/,
    carrier: {
      id: 'correios',
      label: 'Correios',
      buildUrl: (code) =>
        `https://rastreamento.correios.com.br/app/index.php?objeto=${code}`
    }
  },
  {
    // Loggi. O `id` continua `lg` porque e o que ja esta gravado no banco —
    // renomear obrigaria a reescrever linha antiga para ganhar nada.
    pattern: /^LG\d{21}$/,
    carrier: {
      id: 'lg',
      label: 'Loggi',
      buildUrl: (code) => `https://app.loggi.com/rastreador/${code}`
    }
  }
]

const DESCONHECIDA: Carrier = {
  id: 'desconhecida',
  label: 'Transportadora não identificada',
  buildUrl: null
}

/** Tira espaco, hifen e ponto, e sobe para maiuscula. */
export function normalizeTrackingCode(raw: string): string {
  return raw.replace(/[\s.-]/g, '').toUpperCase()
}

export function detectCarrier(code: string): Carrier {
  const normalized = normalizeTrackingCode(code)
  for (const { pattern, carrier } of CARRIERS) {
    if (pattern.test(normalized)) return carrier
  }
  return DESCONHECIDA
}

export function carrierLabel(carrierId: string | null): string {
  if (!carrierId) return DESCONHECIDA.label
  const found = CARRIERS.find((c) => c.carrier.id === carrierId)
  return found?.carrier.label ?? DESCONHECIDA.label
}

/** URL publica de rastreio, ou null quando a transportadora nao tem uma. */
export function buildTrackingUrl(code: string): string | null {
  const normalized = normalizeTrackingCode(code)
  const carrier = detectCarrier(normalized)
  return carrier.buildUrl ? carrier.buildUrl(normalized) : null
}
