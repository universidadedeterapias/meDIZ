import { z } from 'zod'

/**
 * Respostas do quiz da pagina /mapa (protótipo `1_gerar.html`, 5 passos).
 *
 * So nome e sintoma travam o avanco — o resto e opcional para nao perder o
 * lead no meio do formulario. Mas e o resto que faz o Mapa acertar o que a
 * pessoa nao disse: as idades viram a linha do tempo, pai/mae vira a arvore.
 */

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

export const entradaMapaSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  sintoma: z.string().trim().min(4).max(500),
  tempo: opcional(120),
  momentos: z
    .array(
      z.object({
        momento: z.string().trim().max(200),
        idade: opcional(20)
      })
    )
    .max(3)
    .optional()
    .transform((lista) =>
      (lista ?? []).filter((m) => m.momento.length > 0)
    ),
  familia: opcional(500),
  /** `?id=` do link da Aline (telefone). */
  telefone: opcional(30),
  utm: z.record(z.string().max(200)).optional().nullable()
})

export type EntradaMapa = z.infer<typeof entradaMapaSchema>
