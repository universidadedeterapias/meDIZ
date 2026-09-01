import type { SpecialistAgent } from '@/lib/conversational-chat/config'
import { registrarEventoDeJornadaEmSegundoPlano } from '@/lib/journey/events'

/**
 * Os seis gatilhos do corredor, um por funcao.
 *
 * Existem para que quem chama nao precise lembrar o nome da variavel nem o
 * formato do valor — quem cuida disso e este arquivo, que e o unico lugar onde o
 * contrato com o Chatvolt esta escrito. Um `usou_prof = "Sim"` no meio da rota de
 * chat viraria uma variavel que a Aline nunca encontra.
 */

/**
 * O especialista do app dito no vocabulario do atendimento.
 *
 * O app chama de `body`/`home`/`pet` e o Chatvolt espera `corpo`/`casa`/`pet`:
 * traduzir na saida e mais barato do que renomear os dois lados.
 */
const DOMINIO: Record<SpecialistAgent, string> = {
  body: 'corpo',
  home: 'casa',
  pet: 'pet'
}

/** Primeira entrada no app depois da compra. */
export function marcaPrimeiroAcesso(userId: string, quando = new Date()): void {
  registrarEventoDeJornadaEmSegundoPlano({
    userId,
    evento: 'trial_inicio',
    variaveis: [{ nome: 'trial_inicio', valor: quando.toISOString() }]
  })
}

/**
 * Pesquisa concluida com um especialista.
 *
 * Sao dois eventos de uma vez, e nao um: `primeira_pesquisa` grava em que dominio
 * a pessoa entrou — o assunto da conversa daqui pra frente — e `pesquisa` diz que
 * ela continua ativa. O primeiro so acontece uma vez; o segundo se repete. Quem
 * decide isso e a fila, pelo unique e pela janela, nao quem chama.
 *
 * Conversa com o porteiro nao conta: enquanto o encaminhamento nao fecha, nao
 * houve pesquisa em dominio nenhum.
 */
export function marcaPesquisa(
  userId: string,
  especialista: SpecialistAgent,
  quando = new Date()
): void {
  registrarEventoDeJornadaEmSegundoPlano({
    userId,
    evento: 'primeira_pesquisa',
    variaveis: [{ nome: 'dominio1', valor: DOMINIO[especialista] }]
  })
  registrarEventoDeJornadaEmSegundoPlano({
    userId,
    evento: 'pesquisa',
    variaveis: [
      { nome: 'uso', valor: 'ativo' },
      { nome: 'ultima_pesquisa', valor: quando.toISOString() }
    ]
  })
}

/** Primeira conversa com o PROF. */
export function marcaUsouProf(userId: string): void {
  registrarEventoDeJornadaEmSegundoPlano({
    userId,
    evento: 'usou_prof',
    variaveis: [{ nome: 'usou_prof', valor: 'sim' }]
  })
}

/** Primeira sessao no Simular Terapia. */
export function marcaUsouSimulador(userId: string): void {
  registrarEventoDeJornadaEmSegundoPlano({
    userId,
    evento: 'usou_simulador',
    variaveis: [{ nome: 'usou_simulador', valor: 'sim' }]
  })
}

/**
 * O livro impresso chegou.
 *
 * Vale tanto o botao "recebi o livro" quanto a transportadora confirmando a
 * entrega — para o corredor as duas coisas significam a mesma: da para falar do
 * livro na mao da pessoa.
 */
export function marcaLivroRecebido(userId: string, quando = new Date()): void {
  registrarEventoDeJornadaEmSegundoPlano({
    userId,
    evento: 'livro_recebido',
    variaveis: [{ nome: 'livro_recebido', valor: quando.toISOString() }]
  })
}
