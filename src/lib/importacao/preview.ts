import { lookupCustomer } from '@/lib/customer/lookup'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { normalizeCpf } from '@/lib/cpf'
import { montarTelefone } from '@/lib/phone'
import type { LinhaBruta } from './planilha'

/**
 * Mapeamento de colunas escolhido pelo operador na tela de importação — a
 * chave é o nome da coluna na planilha, não uma posição fixa.
 */
export type MapeamentoColunas = {
  nome?: string
  email?: string
  whatsapp?: string
  cpf?: string
  dataCompra?: string
}

export type ClassificacaoLinha = 'novo' | 'existente' | 'ambiguo' | 'erro'

export type LinhaPreview = {
  indice: number
  bruta: LinhaBruta
  nome: string | null
  email: string | null
  whatsapp: string | null
  cpf: string | null
  dataCompra: string | null
  classificacao: ClassificacaoLinha
  motivoErro?: string
  userIdExistente?: string
  /** Permite excluir a linha antes de confirmar. Falso por padrão em `erro`. */
  incluida: boolean
}

function textoOuNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

function dataOuNull(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** Roda `n` promessas por vez, com o índice original — uma planilha de
 *  milhares de linhas não pode virar milhares de queries síncronas numa
 *  única request. */
async function emLotes<T, R>(
  itens: T[],
  n: number,
  fn: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const saida: R[] = new Array(itens.length)
  for (let i = 0; i < itens.length; i += n) {
    const lote = itens.slice(i, i + n)
    const resultados = await Promise.all(lote.map((item, j) => fn(item, i + j)))
    for (let j = 0; j < resultados.length; j++) saida[i + j] = resultados[j]
  }
  return saida
}

/**
 * Para cada linha da planilha, extrai os campos pelo mapeamento escolhido e
 * classifica se a pessoa já existe — reaproveitando `lookupCustomer` tal
 * como está, sem inventar um matching novo.
 */
export async function montarPreview(
  linhas: LinhaBruta[],
  mapeamento: MapeamentoColunas
): Promise<LinhaPreview[]> {
  return emLotes(linhas, 20, async (bruta, indice) => {
    const nome = mapeamento.nome ? textoOuNull(bruta[mapeamento.nome]) : null
    const emailBruto = mapeamento.email ? textoOuNull(bruta[mapeamento.email]) : null
    const email = emailBruto ? normalizeLibraryEmail(emailBruto) : null
    const whatsappBruto = mapeamento.whatsapp ? textoOuNull(bruta[mapeamento.whatsapp]) : null
    const whatsapp = whatsappBruto ? montarTelefone({ numero: whatsappBruto }) : null
    const cpfBruto = mapeamento.cpf ? textoOuNull(bruta[mapeamento.cpf]) : null
    const cpf = cpfBruto ? normalizeCpf(cpfBruto) : null
    const dataCompra = mapeamento.dataCompra ? dataOuNull(bruta[mapeamento.dataCompra]) : null

    const base = { indice, bruta, nome, email, whatsapp, cpf, dataCompra }

    // E-mail e obrigatorio: e a chave unica de User, e sem ele nao ha como
    // criar nem casar conta nenhuma.
    if (!email) {
      return { ...base, classificacao: 'erro' as const, motivoErro: 'sem e-mail', incluida: false }
    }

    const resultado = await lookupCustomer({ email, cpf, whatsapp })

    if (resultado.ambiguous) {
      return { ...base, classificacao: 'ambiguo' as const, incluida: false }
    }
    if (resultado.found && resultado.customer) {
      return {
        ...base,
        classificacao: 'existente' as const,
        userIdExistente: resultado.customer.id,
        incluida: true
      }
    }
    return { ...base, classificacao: 'novo' as const, incluida: true }
  })
}
