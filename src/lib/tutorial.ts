/**
 * Tutorial de boas-vindas do meDIZ 2.0 — um demo interativo hospedado no
 * Supademo. Todo mundo passa por ele uma vez; depois fica disponivel pela
 * sidebar para rever.
 *
 * O demo roda no site do Supademo, nao embutido: /tutorial marca como visto e
 * redireciona para la. O caminho de volta e o botao no fim do proprio demo, que
 * aponta para o meDIZ — por isso a marca e gravada ANTES de sair, senao a volta
 * cairia de novo no gate.
 */

/** Demo publicado no Supademo (link compartilhado pelo time). */
export const TUTORIAL_DEMO_ID = 'cmsnk8mhd007cxw0jlyvxxwfl'

/**
 * URL do tutorial. Trocar o demo (ou apontar para outro em HML) so precisa da
 * env `TUTORIAL_DEMO_URL` — sem deploy de codigo.
 */
export function getTutorialUrl(): string {
  const fromEnv = process.env.TUTORIAL_DEMO_URL?.trim()
  if (fromEnv) return fromEnv

  return `https://app.supademo.com/demo/${TUTORIAL_DEMO_ID}`
}
