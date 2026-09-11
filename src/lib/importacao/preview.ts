import { lookupCustomer } from '@/lib/customer/lookup'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { normalizeCpf } from '@/lib/cpf'
import { montarTelefone } from '@/lib/phone'
import { phoneVariants } from '@/lib/customer/phone-match'
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
  const resultado = await emLotes(linhas, 20, async (bruta, indice) => {
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

    const encontrado = await lookupCustomer({ email, cpf, whatsapp })

    if (encontrado.ambiguous) {
      return { ...base, classificacao: 'ambiguo' as const, incluida: false }
    }
    if (encontrado.found && encontrado.customer) {
      return {
        ...base,
        classificacao: 'existente' as const,
        userIdExistente: encontrado.customer.id,
        incluida: true
      }
    }
    return { ...base, classificacao: 'novo' as const, incluida: true }
  })

  marcarDuplicidadeCruzada(resultado)
  return resultado
}

/**
 * Duas linhas 'novo' da MESMA planilha com o mesmo CPF ou telefone, mas
 * e-mails diferentes, são a mesma pessoa — só que nenhuma das duas está no
 * banco ainda, então `lookupCustomer` não tem como perceber a coincidência
 * sozinho (ele só compara contra o banco, nunca contra as outras linhas do
 * arquivo). Sem esta checagem, confirmar a importação criaria duas contas
 * para a mesma pessoa. A comparação só entra em linhas ainda 'novo': se uma
 * das duas já bateu com uma conta existente, o caminho normal (CPF/telefone
 * dentro de `lookupCustomer`) já resolve as duas para a mesma conta.
 *
 * Mutação in-place de propósito — evita recriar o array só para trocar
 * `classificacao` de algumas posições.
 */
function marcarDuplicidadeCruzada(linhas: LinhaPreview[]): void {
  const porCpf = new Map<string, number[]>()
  const porTelefone = new Map<string, number[]>()

  for (const l of linhas) {
    if (l.classificacao !== 'novo') continue
    if (l.cpf) {
      const grupo = porCpf.get(l.cpf) ?? []
      grupo.push(l.indice)
      porCpf.set(l.cpf, grupo)
    }
    for (const variante of phoneVariants(l.whatsapp)) {
      const grupo = porTelefone.get(variante) ?? []
      grupo.push(l.indice)
      porTelefone.set(variante, grupo)
    }
  }

  const marcar = (indices: number[], motivo: (outraLinha: number) => string) => {
    if (indices.length < 2) return
    const emails = new Set(indices.map((i) => linhas[i].email))
    // Mesmo e-mail nas duas linhas: já é tratado pelo caminho normal (a
    // segunda linha casa com a conta que a primeira acabou de criar).
    if (emails.size < 2) return

    for (const i of indices) {
      if (linhas[i].classificacao === 'ambiguo') continue // primeiro motivo encontrado prevalece
      const outraLinha = indices.find((j) => j !== i)!
      linhas[i] = {
        ...linhas[i],
        classificacao: 'ambiguo',
        motivoErro: motivo(outraLinha),
        incluida: false
      }
    }
  }

  for (const grupo of porCpf.values()) {
    marcar(grupo, (outraLinha) => `Mesmo CPF que a linha ${outraLinha + 1}, e-mails diferentes.`)
  }
  for (const grupo of porTelefone.values()) {
    marcar(grupo, (outraLinha) => `Mesmo telefone que a linha ${outraLinha + 1}, e-mails diferentes.`)
  }
}
