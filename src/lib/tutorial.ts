/**
 * Tutorial de boas-vindas do meDIZ 2.0 — um demo interativo hospedado no
 * Supademo, embutido em /tutorial. Todo mundo passa por ele uma vez; depois
 * fica disponivel pela sidebar para rever.
 */

/** Demo publicado no Supademo (link compartilhado pelo time). */
export const TUTORIAL_DEMO_ID = 'cmsnk8mhd007cxw0jlyvxxwfl'

/** Versao do player de embed do Supademo. */
const TUTORIAL_EMBED_VERSION = '2'

/**
 * URL do iframe. Trocar o demo (ou apontar para outro em HML) so precisa da env
 * `TUTORIAL_DEMO_URL` — sem deploy de codigo.
 */
export function getTutorialEmbedUrl(): string {
  const fromEnv = process.env.TUTORIAL_DEMO_URL?.trim()
  if (fromEnv) return fromEnv

  return `https://app.supademo.com/embed/${TUTORIAL_DEMO_ID}?embed_v=${TUTORIAL_EMBED_VERSION}`
}

/** Link do demo fora do embed, usado quando o iframe nao carrega. */
export function getTutorialShareUrl(): string {
  const fromEnv = process.env.TUTORIAL_DEMO_URL?.trim()
  if (fromEnv) return fromEnv

  return `https://app.supademo.com/demo/${TUTORIAL_DEMO_ID}`
}
