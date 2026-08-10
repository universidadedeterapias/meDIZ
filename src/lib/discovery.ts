import { z } from 'zod'

export const DISCOVERY_MAX_USER_TURNS = 4
export const DISCOVERY_TEXT_MAX_LENGTH = 450
export const DISCOVERY_AUDIO_NUDGE_SECONDS = 12
export const DISCOVERY_AUDIO_MAX_SECONDS = 30
export const DISCOVERY_SESSION_MAX_SECONDS = 90

export const discoveryChannelSchema = z.enum(['voice', 'text'])
export const discoveryRoleSchema = z.enum(['assistant', 'user'])

export const discoveryTranscriptMessageSchema = z.object({
  messageId: z.string().min(1),
  role: discoveryRoleSchema,
  text: z.string().trim().min(1).max(2000),
  channel: discoveryChannelSchema,
  durationSeconds: z.number().finite().min(0).max(300)
})

export const discoveryTranscriptSchema = z.array(discoveryTranscriptMessageSchema).min(1).max(20)

export const discoveryUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
    inputTextTokens: z.number().int().nonnegative(),
    inputAudioTokens: z.number().int().nonnegative(),
    outputTextTokens: z.number().int().nonnegative(),
    outputAudioTokens: z.number().int().nonnegative()
  })
  .nullable()

export const discoveryCompletedEventSchema = z.object({
  eventId: z.string().uuid(),
  schemaVersion: z.literal(1),
  userId: z.string().uuid(),
  source: z.literal('discovery'),
  completedAt: z.string().datetime(),
  predominantChannel: z.enum(['voice', 'text', 'mixed']),
  totalDurationSeconds: z.number().finite().min(0).max(600),
  transcript: discoveryTranscriptSchema,
  usage: discoveryUsageSchema
})

export const discoveryProfileSchema = z.object({
  usageContext: z.enum(['personal', 'professional']).nullable(),
  preferredStyle: z.enum(['direct', 'supportive', 'balanced']).nullable(),
  core: z.record(z.string(), z.unknown()),
  dynamics: z.record(z.string(), z.unknown()),
  predictive: z.record(z.string(), z.unknown()),
  compactProfile: z.string().trim().min(1).max(5000),
  profileVersion: z.number().int().positive().default(1)
})

export type DiscoveryChannel = z.infer<typeof discoveryChannelSchema>
export type DiscoveryTranscriptRole = z.infer<typeof discoveryRoleSchema>
export type DiscoveryTranscriptMessage = z.infer<typeof discoveryTranscriptMessageSchema>
export type DiscoveryCompletedEvent = z.infer<typeof discoveryCompletedEventSchema>
export type DiscoveryProfile = z.infer<typeof discoveryProfileSchema>
export type DiscoveryChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

export const DISCOVERY_END_ANCHOR = 'A partir de agora, o meDIZ é seu.'

export const DISCOVERY_OPENING_MESSAGE = 'Antes de tudo: como eu te chamo?'

/**
 * Prompt do agente de descoberta. A versao original (repo indevmediz) detectava o fim da conversa
 * por fuzzy-match da frase de fechamento — aqui o fechamento e sinalizado por uma tool-call
 * explicita (`finish_discovery`, configurada no RealtimeAgent na Story 2.3), por isso a instrucao
 * de FECHAMENTO abaixo pede para chamar a funcao em vez de recitar uma frase fixa.
 */
export const DISCOVERY_SYSTEM_PROMPT = `VOCE E O meDIZ.

Primeira vez que esta pessoa fala com voce. Sem cadastro, sem
formulario. Em ate 90 segundos voce capta quem ela e por dentro.
Faca qualquer interpretacao internamente. Nunca verbalize o que
concluiu. Voce nao esta aqui para ajuda-la com nada agora. Esta aqui
para entende-la sem transformar a conversa em uma entrevista. Em
seguida ela entra no app.

COMO VOCE FUNCIONA
Voce faz perguntas curtas, ousadas e independentes no conteudo. Pula
de um assunto a outro, como uma inteligencia que sonda facetas
diferentes, nunca como um questionario que afunila um tema. Antes de
cada pergunta nova (exceto a primeira), espelhe rapidamente algo que
ela acabou de dizer, com as palavras DELA — um eco curto e caloroso,
nunca uma leitura ou analise. E so depois do espelho que voce salta
pra um assunto diferente. O que te interessa nao e so o conteudo da
resposta; e o que a FORMA dela revela. Isso e trabalho seu, por
dentro. Voce nunca mostra a interpretacao — so o espelho.

PROIBICOES ABSOLUTAS
- NUNCA verbalize a INTERPRETACAO do que percebeu. Nada de "entendi
  que voce...", "percebo que...", "vejo alguem que...". O espelho e
  sempre uma frase curta com as palavras DELA, nunca uma leitura sua.
- NUNCA use o espelho pra continuar no MESMO assunto. Depois de
  espelhar, a pergunta seguinte e sobre outra coisa. Ela diz "amarelo
  e minha cor preferida" -> voce espelha ("amarelo, gostei.") e a
  pergunta seguinte NAO e sobre cores.
- NUNCA diga: cadastro, perfil, dados, formulario, teste, entrevista,
  analise.
- NUNCA diagnostique nem prometa tratar ou curar.

ESTILO
- Uma pergunta por vez. Curta. Voce fala MUITO menos que ela.
- Tom intrigante, levemente provocativo: do tipo que faz pensar
  "que pergunta e essa?". Caloroso, mas afiado.
- No maximo 4 perguntas. Nunca mais que isso.
- Antes de cada pergunta (exceto a primeira), espelhe em poucas
  palavras algo que ela disse, com as palavras dela — nao um resumo,
  so um eco. Depois salte pra um assunto novo. Exemplos: "Amarelo,
  gostei. Agora outra:" ou "'Mil abas abertas', anotado. Edgar, uma
  bem diferente:".
- Cada fala sua tem no maximo tres frases curtas: o espelho, uma
  transicao opcional e uma pergunta.

OS 4 ALVOS
Capte um por pergunta. Varie a ordem e a formulacao a cada usuario
para nunca soar igual, exceto o NOME, que e sempre o primeiro.

1. NOME - como ela quer ser chamada. Sempre a primeira.
   Exemplo: "Antes de tudo: como eu te chamo?"
2. CONTEXTO - pergunta DIRETA, autocontida e sem rodeio. Identifique se
   ela usa o meDIZ para si ou pelo trabalho. Use variacoes de:
   - "Voce esta aqui por voce, ou por causa do seu trabalho?"
   - "Voce veio ao meDIZ por uma questao sua, ou pelo que faz pra viver?"
   - "Voce procurou o meDIZ pra voce, ou pra usar com outras pessoas?"
3. ESTILO - como ela quer ser tratada pelo meDIZ: na lata ou com
   jeito; empurrada ou acolhida.
   - "Conselho bom e o que te abraca ou o que te sacode?"
   - "Voce confia mais em quem te poupa ou em quem te diz a verdade crua?"
4. NUCLEO - instinto x ponderacao, OU uma tensao real dela. Uma so.
   Nao cave.
   - "Decisao dificil: voce resolve na hora ou dorme em cima?"
   - "O que anda ocupando mais espaco na sua cabeca?"
   - "Como e a sua relacao com quem te criou?"

CONTROLE DOS TURNOS
Cada resposta do usuario conclui um alvo. Nao repita nem faca uma
pergunta adicional para esclarecer respostas vagas. Depois da quarta
resposta do usuario, nao faca outra pergunta.

Nunca use "isso", "essa coisa" ou outro pronome sem referente. Toda
pergunta deve fazer sentido sozinha para quem a escuta.

FECHAMENTO
Quando tiver os 4 alvos, chame a funcao finish_discovery. Antes de
chama-la, encerre a fala em voz seco e caloroso, SEM recitar nada do
que aprendeu e SEM anunciar que vai chamar uma funcao. Responda
exatamente: "E isso. A partir de agora, o meDIZ e seu." e em seguida
chame finish_discovery. Nao estique, nao pergunte se ela quer seguir,
nao resuma.`

const COMBINING_DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_REGEX, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * @deprecated Mantido apenas como referencia/fallback. A Story 2.3 substitui a deteccao de fim
 * de fluxo por uma tool-call explicita (`finish_discovery`) em vez de fuzzy-match de texto.
 */
export function hasDiscoveryEndAnchor(text: string) {
  return normalizeText(text).includes(normalizeText(DISCOVERY_END_ANCHOR))
}

export function getPredominantDiscoveryChannel(
  transcript: DiscoveryTranscriptMessage[]
): DiscoveryChannel | 'mixed' {
  const userMessages = transcript.filter((message) => message.role === 'user')
  const voiceCount = userMessages.filter((message) => message.channel === 'voice').length
  const textCount = userMessages.filter((message) => message.channel === 'text').length

  if (voiceCount > 0 && textCount > 0) return 'mixed'
  if (voiceCount > 0) return 'voice'
  return 'text'
}

export function transcriptToChatMessages(
  transcript: DiscoveryTranscriptMessage[]
): DiscoveryChatMessage[] {
  return transcript.map((message) => ({
    role: message.role,
    content: message.text
  }))
}
