import { phoneVariants } from '@/lib/customer/phone-match'

/**
 * Confere se quem esta conversando e o dono da conta consultada.
 *
 * O link de acesso loga sem senha — e credencial, nao informacao. E a unica coisa
 * que a pessoa do outro lado precisa fazer para pedir o de outra e digitar o
 * e-mail dela: o campo e livre, e a Aline nao tem como saber que aquele e-mail nao
 * e dela. Por isso a conferencia mora aqui, e nao no prompt do agente. Prompt e
 * texto que o modelo pondera; isto e uma decisao que nao pode ser negociada no
 * meio de uma conversa.
 *
 * A comparacao e contra o telefone da CONVERSA, que o canal preenche sozinho, e
 * nunca contra um campo que o cliente digita — um dado que o proprio suspeito
 * informa nao confirma coisa nenhuma.
 */
export type ResultadoIdentidade =
  /** O telefone da conversa e o do cadastro: pode entregar o link. */
  | 'confere'
  /** Telefone da conversa nao bate com o cadastro. */
  | 'nao_confere'
  /** A conta nao tem telefone gravado — nao ha contra o que conferir. */
  | 'sem_telefone_no_cadastro'
  /** Quem chamou nao mandou o telefone da conversa. */
  | 'nao_informado'

/**
 * So `confere` libera o link. Os outros tres casos sao diferentes entre si para o
 * atendimento saber o que dizer, mas iguais para a decisao: sem link.
 */
export function confereIdentidade(
  telefoneDoCadastro: string | null | undefined,
  telefoneDaConversa: string | null | undefined
): ResultadoIdentidade {
  const daConversa = phoneVariants(telefoneDaConversa)
  if (daConversa.length === 0) return 'nao_informado'

  const doCadastro = phoneVariants(telefoneDoCadastro)
  if (doCadastro.length === 0) return 'sem_telefone_no_cadastro'

  // Interseccao das variantes, e nao sufixo: as duas listas ja trazem as formas
  // equivalentes do mesmo numero (com e sem DDI, com e sem o nono digito), entao
  // igualdade entre elas e o casamento correto. Casar por sufixo juntaria DDDs e
  // paises diferentes, que aqui significaria dar acesso a conta de outra pessoa.
  const cadastro = new Set(doCadastro)
  return daConversa.some((v) => cadastro.has(v)) ? 'confere' : 'nao_confere'
}

/** Frase para o log e para o agente entender por que o link nao veio. */
export function explicaIdentidade(resultado: ResultadoIdentidade): string {
  if (resultado === 'confere') return 'Telefone da conversa confere com o cadastro.'
  if (resultado === 'nao_confere') {
    return 'O telefone desta conversa nao e o do cadastro. Nao envie link aqui: use o reenvio, que sai para o contato cadastrado.'
  }
  if (resultado === 'sem_telefone_no_cadastro') {
    return 'A conta nao tem telefone gravado, entao nao da para confirmar a identidade por aqui. Use o reenvio, que sai para o e-mail cadastrado.'
  }
  return 'Telefone da conversa nao foi informado na chamada. Sem ele o link nao e gerado.'
}
