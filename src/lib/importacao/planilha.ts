import * as XLSX from 'xlsx'

/**
 * Le .xlsx/.xls/.csv e devolve linhas cruas + as colunas que a planilha tem.
 *
 * So servidor — nunca importar este arquivo de um componente client, senao o
 * xlsx (SheetJS) entra no bundle do navegador a toa.
 *
 * `cellDates: true` e o que evita a armadilha classica do Excel: sem isso,
 * uma celula de data vira um numero serial (ex.: 45678) em vez de vir como
 * Date, e o "dataCompra" da planilha chegaria irreconhecivel do outro lado.
 */

export type LinhaBruta = Record<string, unknown>

export type ColunaDetectada = {
  chave: string
  /** Ate 3 valores de exemplo, para a tela de mapeamento mostrar "essa coluna
   *  parece ter e-mails" sem a pessoa precisar abrir a planilha original. */
  amostra: string[]
}

export type PlanilhaLida = {
  colunas: ColunaDetectada[]
  linhas: LinhaBruta[]
}

function paraTexto(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

export function lerPlanilha(buffer: Buffer): PlanilhaLida {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const nomeAba = workbook.SheetNames[0]
  if (!nomeAba) return { colunas: [], linhas: [] }

  const aba = workbook.Sheets[nomeAba]
  const linhas = XLSX.utils.sheet_to_json<LinhaBruta>(aba, {
    defval: null,
    raw: true
  })

  const chaves = linhas.length > 0 ? Object.keys(linhas[0]) : []
  const colunas: ColunaDetectada[] = chaves.map((chave) => ({
    chave,
    amostra: linhas
      .slice(0, 5)
      .map((l) => paraTexto(l[chave]))
      .filter(Boolean)
      .slice(0, 3)
  }))

  return { colunas, linhas }
}
