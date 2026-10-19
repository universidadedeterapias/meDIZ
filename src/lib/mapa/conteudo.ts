import { z } from 'zod'

/**
 * Conteudo do Mapa da Origem Emocional — o contrato entre o gerador (n8n) e a
 * tela.
 *
 * A IA preenche so o que muda de pessoa para pessoa; o que e igual para todo
 * mundo (regra de leitura da carta, explicacao das fases, caminho [RE]Sentir,
 * as tres portas, o rodape) mora no template `MapaDocumento`. Assim o layout
 * nao depende do humor do modelo, a saida pode ser validada, e o mesmo JSON
 * serve para a tela, o PDF e o template de audioterapia (`frase_forte`).
 *
 * A ordem dos campos segue as 14 secoes do doc de concepcao (v1, 14/10/2026).
 * Em qualquer texto, `**trecho**` vira destaque — e o unico markup aceito.
 *
 * Mudou o formato? Suba `MAPA_SCHEMA_VERSION` e mantenha o leitor da versao
 * anterior: Mapa pago fica na Biblioteca para sempre.
 */

export const MAPA_SCHEMA_VERSION = 1

const texto = (max: number) => z.string().trim().min(1).max(max)

/** Nos da arvore de tres geracoes, na ordem em que o template desenha. */
export const NOS_ARVORE = [
  'avo_paterno',
  'avo_paterna',
  'avo_materno',
  'avo_materna',
  'pai',
  'mae',
  'tios',
  'irmaos'
] as const

export type NoArvore = (typeof NOS_ARVORE)[number]

export const conteudoMapaSchema = z.object({
  versao: z.literal(MAPA_SCHEMA_VERSION),

  /** 1 · Capa. O nome e a data vem do registro, nao da IA. */
  capa: z.object({
    /** O sintoma como titulo curto: "Diabetes tipo 1", "Dor na lombar". */
    sintoma_titulo: texto(60),
    /** Complemento de tempo, se a pessoa informou: "desde os 20 anos". */
    desde: texto(60).nullable()
  }),

  /** 2 · Carta de abertura do Prof. — a regra de leitura e fixa no template. */
  carta: z.object({
    paragrafos: z.array(texto(600)).min(1).max(3)
  }),

  /** 3 · O que o corpo esta dizendo: afirmacoes para marcar. */
  reconhecimento: z.object({
    afirmacoes: z.array(texto(300)).min(4).max(7),
    /** Fecho em destaque: "Repara que nenhuma fala de acucar." */
    fechamento: texto(240)
  }),

  /** 4 · A linguagem popular que ja sabia. */
  linguagem_popular: z.object({
    frases: z.array(texto(80)).min(3).max(6)
  }),

  /** 5 · O sentido biologico. */
  sentido_biologico: z.object({
    /** Orgao ou regiao com artigo: "o pâncreas", "a lombar". */
    orgao: texto(40),
    paragrafos: z.array(texto(700)).min(1).max(3),
    /** A frase-sintese em destaque. */
    frase_sintese: texto(300)
  }),

  /** 6 · O conflito especifico. */
  conflito: z.object({
    raiz: texto(600),
    cenarios: z.array(texto(300)).length(3),
    /**
     * A leitura que cruza o conflito com o que a pessoa contou no quiz
     * (momentos, pai/mae). Null quando ela nao contou nada alem do sintoma.
     */
    leitura_pessoal: texto(500).nullable(),
    /** Complemento da pergunta-chave, amarrado as idades dela quando houver. */
    pergunta_chave: texto(300)
  }),

  /** 7 · Desde quando. Marcos com os dados dela + ao menos um em aberto. */
  linha_do_tempo: z.object({
    marcos: z
      .array(
        z.object({
          rotulo: texto(40),
          texto: texto(400),
          /** Marco que ela ainda precisa preencher (bolinha vazada). */
          aberto: z.boolean()
        })
      )
      .min(2)
      .max(6),
    pergunta: texto(300)
  }),

  /** 8 · A fase em que o corpo esta. */
  fase: z.object({
    sinais_luta: texto(240),
    sinais_reparacao: texto(240),
    leitura: texto(500)
  }),

  /** 9 · Lado, intensidade, repeticao. */
  repeticao: z.object({
    /** Lateralidade, quando o sintoma tem lado. Null quando nao se aplica. */
    lateralidade: texto(400).nullable(),
    texto: texto(600),
    pergunta: texto(240)
  }),

  /** 10 · O programa que veio antes de voce. */
  programa_familiar: z.object({
    texto: texto(600),
    /** O que marcar na arvore. */
    instrucao: texto(300),
    /** Anotacoes nos nos da arvore, so onde ela contou algo. */
    arvore: z
      .object(
        Object.fromEntries(
          NOS_ARVORE.map((no) => [no, texto(80).nullable().optional()])
        ) as Record<NoArvore, z.ZodOptional<z.ZodNullable<z.ZodString>>>
      )
      .strict(),
    /** A pergunta para levar a mae. */
    pergunta: texto(240)
  }),

  /** 11 · As crencas que sustentam o sintoma. */
  crencas: z.object({
    itens: z.array(texto(120)).min(5).max(8)
  }),

  /** 12 · O que o corpo pede, em primeira pessoa. */
  corpo_pede: z.object({
    pedidos: z.array(texto(300)).min(3).max(4)
  }),

  /** 13 · Primeiros passos. O caminho [RE]Sentir e as portas sao fixos. */
  primeiros_passos: z.object({
    passos: z
      .array(z.object({ titulo: texto(60), texto: texto(300) }))
      .length(3)
  }),

  /** 14 · Releitura em 30 e 90 dias. */
  releitura: z.object({
    pergunta_30: texto(200),
    pergunta_90: texto(200)
  }),

  /** Encerramento: trecho de O Corpo Diz sobre aquele sintoma. */
  citacao_final: texto(400),

  /** Uma frase marcante do Mapa, para o template de audioterapia. */
  frase_forte: texto(300)
})

export type ConteudoMapa = z.infer<typeof conteudoMapaSchema>

export type ValidacaoConteudo =
  | { ok: true; conteudo: ConteudoMapa }
  | { ok: false; erro: string }

/** Valida a saida do gerador, com o primeiro problema legivel no erro. */
export function validarConteudoMapa(entrada: unknown): ValidacaoConteudo {
  const resultado = conteudoMapaSchema.safeParse(entrada)
  if (resultado.success) return { ok: true, conteudo: resultado.data }

  const problemas = resultado.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
    .join('; ')
  return { ok: false, erro: problemas.slice(0, 500) }
}
