import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Eventos de uso do app que viram variavel de conversa no Chatvolt.
 *
 * O corredor de conversao reage ao que a pessoa FAZ, e nao a datas. Uma jornada
 * guiada por calendario manda "aproveite seu ultimo dia" para quem nunca entrou;
 * uma guiada por evento nao faz isso. Para o Chatvolt reagir, alguem precisa
 * contar o que aconteceu — e quem sabe e o app.
 *
 * O caminho e uma fila (`journey_events`), e nao uma chamada direta ao Chatvolt.
 * Tres motivos, em ordem de importancia:
 *
 * 1. O evento acontece no meio de um pedido do usuario. Se gravar a variavel
 *    fosse sincrono, uma indisponibilidade do Chatvolt viraria pesquisa travada
 *    na tela de quem esta usando o app.
 * 2. Resolver a conversa a partir do telefone e trabalho do n8n, que ja tem a
 *    credencial e o mapa dos dois agentes espelhados. O app nao precisa saber
 *    disso.
 * 3. Evento perdido nao volta. Primeira pesquisa so acontece uma vez, e perde-la
 *    e a Aline falando generico com quem ja usou o app.
 */

/** Gatilhos previstos no contrato do corredor. */
export type NomeDeEvento =
  | 'trial_inicio'
  | 'primeira_pesquisa'
  | 'pesquisa'
  | 'usou_prof'
  | 'usou_simulador'
  | 'livro_recebido'

export type VariavelDeConversa = { nome: string; valor: string }

/**
 * O unico evento que se repete.
 *
 * Os outros cinco sao "primeira vez" por definicao, e o unique de
 * `(user_id, event_name)` ja e a trava. `pesquisa` responde outra pergunta —
 * "essa pessoa continua ativa?" — entao reaproveita a mesma linha para atualizar
 * a data da ultima.
 */
const RECORRENTES = new Set<NomeDeEvento>(['pesquisa'])

/**
 * Quanto tempo o evento recorrente espera antes de valer a pena reavisar.
 *
 * Sem isso, quem pesquisa dez vezes numa tarde gera dez escritas do mesmo valor
 * no Chatvolt. Doze horas mantem a variavel util para a regra de "silencio de
 * mais de 24h" com folga, e derruba o volume para no maximo duas por dia.
 */
const JANELA_RECORRENTE_MS = 12 * 60 * 60 * 1000

/**
 * Limites do Chatvolt, que falha em silencio quando sao estourados.
 *
 * Nome ate 20 caracteres, valor ate 100. Estourar nao da erro: a variavel
 * simplesmente nao existe na conversa, e o defeito so aparece semanas depois como
 * "a Aline nao sabe que essa pessoa pesquisou".
 */
const MAX_NOME = 20
const MAX_VALOR = 100

/**
 * Minusculas, sem acento, sem espaco — como o Chatvolt exige.
 *
 * Data ISO e a excecao deliberada: o `T` e o `Z` sao parte do formato, e
 * minusculiza-los quebraria a leitura da data do outro lado. O contrato pede as
 * duas coisas, e entre "minusculo" e "ISO valido" quem manda e o ISO.
 */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

export function normalizaValor(valor: string): string {
  const bruto = valor.trim()
  if (ISO.test(bruto)) return bruto.slice(0, MAX_VALOR)
  return bruto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .slice(0, MAX_VALOR)
}

function preparaVariaveis(
  evento: NomeDeEvento,
  variaveis: VariavelDeConversa[]
): VariavelDeConversa[] {
  const validas: VariavelDeConversa[] = []
  for (const v of variaveis) {
    if (v.nome.length > MAX_NOME) {
      // Nao trunca: um nome cortado grava a variavel errada, e uma variavel
      // errada na conversa e pior que variavel nenhuma.
      logger.error(
        `Variavel "${v.nome}" do evento ${evento} passa de ${MAX_NOME} caracteres e foi descartada`,
        undefined,
        '[journey]'
      )
      continue
    }
    validas.push({ nome: v.nome, valor: normalizaValor(v.valor) })
  }
  return validas
}

export type ResultadoDoEvento =
  | 'gravado'
  | 'ja_existia'
  | 'fora_do_corredor'
  | 'sem_variavel'
  | 'falhou'

/**
 * Registra um evento de uso na fila do corredor.
 *
 * Nunca lanca. E chamado de dentro de pedidos do usuario — pesquisa, login,
 * confirmacao de entrega — e nenhum desses pode quebrar porque a fila do
 * atendimento teve um problema.
 */
export async function registrarEventoDeJornada(input: {
  userId: string
  evento: NomeDeEvento
  variaveis: VariavelDeConversa[]
}): Promise<ResultadoDoEvento> {
  const { userId, evento } = input

  try {
    const recorrente = RECORRENTES.has(evento)

    const existente = await prisma.journeyEvent.findUnique({
      where: { userId_eventName: { userId, eventName: evento } },
      select: { id: true, updatedAt: true }
    })

    if (existente && !recorrente) return 'ja_existia'

    if (
      existente &&
      Date.now() - existente.updatedAt.getTime() < JANELA_RECORRENTE_MS
    ) {
      return 'ja_existia'
    }

    const variaveis = preparaVariaveis(evento, input.variaveis)
    if (variaveis.length === 0) return 'sem_variavel'

    if (existente) {
      // Volta para o inicio da fila com o valor novo: a data da ultima pesquisa
      // so vale se for a ultima mesmo. `attempts` zera porque esta e outra
      // tentativa, e nao a continuacao da anterior.
      await prisma.journeyEvent.update({
        where: { id: existente.id },
        data: {
          variables: variaveis,
          status: 'pending',
          attempts: 0,
          lastError: null,
          availableAt: new Date(),
          processedAt: null
        }
      })
      return 'gravado'
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, whatsapp: true, accessMessageAt: true }
    })

    if (!user) return 'falhou'

    // Quem nunca recebeu o aviso da compra do livro nao tem conversa no Chatvolt
    // para receber variavel nenhuma. `accessMessageAt` e exatamente "esta pessoa
    // entrou no corredor" — sem esse corte, todo usuario do app viraria execucao
    // no n8n procurando uma conversa que nao existe.
    if (!user.accessMessageAt) return 'fora_do_corredor'

    await prisma.journeyEvent.create({
      data: {
        userId,
        eventName: evento,
        email: user.email,
        whatsapp: user.whatsapp,
        variables: variaveis
      }
    })

    return 'gravado'
  } catch (error) {
    // A corrida entre duas abas cai aqui como violacao do unique, e o desfecho e
    // o certo: o evento ja esta na fila.
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return 'ja_existia'
    }

    logger.error(
      `Falha ao registrar o evento ${evento}`,
      error instanceof Error ? error : undefined,
      '[journey]'
    )
    return 'falhou'
  }
}

/** Dispara sem esperar: o evento nao pode atrasar a resposta ao usuario. */
export function registrarEventoDeJornadaEmSegundoPlano(input: {
  userId: string
  evento: NomeDeEvento
  variaveis: VariavelDeConversa[]
}): void {
  void registrarEventoDeJornada(input).catch(() => undefined)
}
