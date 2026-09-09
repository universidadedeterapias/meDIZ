'use client'

/**
 * Importação de planilha — trazer quem comprou antes do app existir.
 *
 * Quatro passos, cada um parando antes de gravar qualquer coisa: upload,
 * mapeamento das colunas, revisão linha a linha (com o matching já rodado),
 * e só então a confirmação que de fato cria/casa contas. O mesmo espírito de
 * "onda nasce em rascunho" da tela de reativação — aqui o rascunho é a
 * revisão, e confirmar é o botão perigoso.
 *
 * Não envia nada: cria a conta, registra a compra histórica e, se marcado,
 * concede o produto — tudo em silêncio. Quem manda mensagem é uma onda de
 * reativação criada depois, filtrando pela tag deste lote.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

type ColunaDetectada = { chave: string; amostra: string[] }
type LinhaBruta = Record<string, unknown>

type CampoMapeavel = 'nome' | 'email' | 'whatsapp' | 'cpf' | 'dataCompra'
const CAMPOS_MAPEAVEIS: { valor: CampoMapeavel; rotulo: string }[] = [
  { valor: 'nome', rotulo: 'Nome' },
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'cpf', rotulo: 'CPF' },
  { valor: 'dataCompra', rotulo: 'Data da compra' }
]

type Mapeamento = Partial<Record<CampoMapeavel, string>>

type Classificacao = 'novo' | 'existente' | 'ambiguo' | 'erro'

type LinhaPreview = {
  indice: number
  bruta: LinhaBruta
  nome: string | null
  email: string | null
  whatsapp: string | null
  cpf: string | null
  dataCompra: string | null
  classificacao: Classificacao
  motivoErro?: string
  incluida: boolean
}

type Produto = { id: string; title: string; active: boolean }

const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  novo: 'Novo',
  existente: 'Já existe',
  ambiguo: 'Ambíguo',
  erro: 'Erro'
}

const COR_CLASSIFICACAO: Record<Classificacao, string> = {
  novo: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  existente: 'border-sky-300 bg-sky-50 text-sky-900',
  ambiguo: 'border-amber-300 bg-amber-50 text-amber-900',
  erro: 'border-destructive/40 bg-destructive/5 text-destructive'
}

function PassoIndicador({ atual }: { atual: number }) {
  const rotulos = ['Upload', 'Mapeamento', 'Revisão', 'Resumo']
  return (
    <div className="flex items-center gap-2 text-xs">
      {rotulos.map((r, i) => {
        const n = i + 1
        const ativo = n === atual
        const feito = n < atual
        return (
          <div key={r} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium ${
                ativo
                  ? 'border-foreground bg-foreground text-background'
                  : feito
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-border text-muted-foreground'
              }`}
            >
              {feito ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={ativo ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {r}
            </span>
            {n < 4 && <span className="mx-1 h-px w-6 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

export default function ImportarPlanilhaPage() {
  const [passo, setPasso] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Passo 1
  const [arquivoEscolhido, setArquivoEscolhido] = useState<File | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [colunas, setColunas] = useState<ColunaDetectada[]>([])
  const [linhasBrutas, setLinhasBrutas] = useState<LinhaBruta[]>([])

  // Passo 2
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mapeamento, setMapeamento] = useState<Mapeamento>({})
  const [catalogProductId, setCatalogProductId] = useState('')
  const [concedeAcesso, setConcedeAcesso] = useState(false)

  // Passo 3
  const [preview, setPreview] = useState<LinhaPreview[]>([])

  // Passo 4
  const [resultado, setResultado] = useState<{
    tagId: string
    criados: number
    casados: number
    ignorados: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/admin/catalog-products')
      .then((r) => r.json())
      .then((j) => setProdutos((j.products ?? []).filter((p: Produto) => p.active)))
      .catch(() => setProdutos([]))
  }, [])

  const contagens = useMemo(() => {
    const base = { novo: 0, existente: 0, ambiguo: 0, erro: 0 }
    for (const l of preview) base[l.classificacao] += 1
    return base
  }, [preview])

  const totalIncluido = preview.filter((l) => l.incluida).length

  async function enviarArquivo() {
    if (!arquivoEscolhido) return
    setCarregando(true)
    setErro(null)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivoEscolhido)
      const res = await fetch('/api/admin/importacao/parse', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Falha ao ler a planilha.')
        return
      }
      setNomeArquivo(json.nomeArquivo)
      setColunas(json.colunas)
      setLinhasBrutas(json.linhas)

      // Tenta adivinhar o mapeamento pelo nome da coluna, so como ponto de
      // partida — a pessoa confere e corrige no passo seguinte.
      const chute: Mapeamento = {}
      for (const c of json.colunas as ColunaDetectada[]) {
        const chave = c.chave.toLowerCase()
        if (!chute.email && /e-?mail/.test(chave)) chute.email = c.chave
        else if (!chute.nome && /nome/.test(chave)) chute.nome = c.chave
        else if (!chute.whatsapp && /(whats|telefone|celular|fone)/.test(chave)) chute.whatsapp = c.chave
        else if (!chute.cpf && /cpf/.test(chave)) chute.cpf = c.chave
        else if (!chute.dataCompra && /(data|compra)/.test(chave)) chute.dataCompra = c.chave
      }
      setMapeamento(chute)
      setPasso(2)
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }

  async function revisar() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/importacao/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas: linhasBrutas, mapeamento })
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Falha ao revisar as linhas.')
        return
      }
      setPreview(json.preview)
      setPasso(3)
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }

  async function confirmar() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/importacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeArquivo,
          catalogProductId,
          concedeAcesso,
          linhas: preview
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Falha ao aplicar a importação.')
        return
      }
      setResultado(json)
      setPasso(4)
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Link
          href="/admin/reativacao"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Reativação
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Importar planilha</h1>
        <p className="text-sm text-muted-foreground">
          Traz gente que comprou antes do app existir. Não manda nada sozinho — quem
          converte é uma onda, criada depois, filtrando pela tag deste lote.
        </p>
      </header>

      <PassoIndicador atual={passo} />

      {erro && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {passo === 1 && (
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Aceita .xlsx, .xls ou .csv — até 10MB. A primeira linha precisa ser o
            cabeçalho.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center hover:border-foreground/40">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              {arquivoEscolhido ? arquivoEscolhido.name : 'Escolher arquivo'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setArquivoEscolhido(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex justify-end">
            <Button onClick={enviarArquivo} disabled={!arquivoEscolhido || carregando}>
              {carregando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Continuar
            </Button>
          </div>
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-5 rounded-lg border bg-card p-5">
          <div>
            <p className="text-sm font-medium">
              {linhasBrutas.length.toLocaleString('pt-BR')} linhas em {nomeArquivo}
            </p>
            <p className="text-xs text-muted-foreground">
              Diga o que cada coluna da planilha significa. E-mail é obrigatório — é
              a chave que decide se a pessoa já tem conta.
            </p>
          </div>

          <div className="space-y-2">
            {colunas.map((c) => (
              <div key={c.chave} className="flex items-center gap-3 rounded-md border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.chave}</p>
                  {c.amostra.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      ex.: {c.amostra.join(' · ')}
                    </p>
                  )}
                </div>
                <select
                  value={
                    (Object.entries(mapeamento).find(([, v]) => v === c.chave)?.[0] as
                      | CampoMapeavel
                      | undefined) ?? ''
                  }
                  onChange={(e) => {
                    const campo = e.target.value as CampoMapeavel | ''
                    setMapeamento((m) => {
                      const novo = { ...m }
                      // Uma coluna da planilha so pode virar um campo — tira de
                      // onde estava antes de por no novo lugar.
                      for (const k of Object.keys(novo) as CampoMapeavel[]) {
                        if (novo[k] === c.chave) delete novo[k]
                      }
                      if (campo) novo[campo] = c.chave
                      return novo
                    })
                  }}
                  className="h-8 w-44 shrink-0 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="">Ignorar</option>
                  {CAMPOS_MAPEAVEIS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Produto do catálogo</label>
              <select
                value={catalogProductId}
                onChange={(e) => setCatalogProductId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Escolha o produto…</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Um produto para o lote inteiro — o que essa lista comprou.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-2 pt-5 text-xs">
              <input
                type="checkbox"
                checked={concedeAcesso}
                onChange={(e) => setConcedeAcesso(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5"
              />
              <span>
                Conceder o produto agora
                <span className="block text-[11px] text-muted-foreground">
                  Desligado: só cria a conta e registra a compra. Ligado: libera o
                  produto de verdade — em silêncio, sem avisar ninguém.
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setPasso(1)}>
              Voltar
            </Button>
            <Button
              onClick={revisar}
              disabled={!mapeamento.email || !catalogProductId || carregando}
              title={
                !mapeamento.email
                  ? 'Escolha qual coluna é o e-mail'
                  : !catalogProductId
                    ? 'Escolha o produto do catálogo'
                    : undefined
              }
            >
              {carregando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Revisar
            </Button>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(contagens) as Classificacao[]).map((c) => (
              <span
                key={c}
                className={`rounded-full border px-2.5 py-1 font-medium ${COR_CLASSIFICACAO[c]}`}
              >
                {contagens[c]} {ROTULO_CLASSIFICACAO[c].toLowerCase()}
              </span>
            ))}
          </div>

          {contagens.ambiguo > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Ambíguo significa mais de uma conta bateu com o telefone da linha —
                esta importação não escolhe sozinha. Ficam desmarcadas por padrão;
                revise à mão se quiser incluir.
              </span>
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 w-9" />
                  <TableHead className="h-9 text-xs">Pessoa</TableHead>
                  <TableHead className="h-9 w-28 text-xs">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((l) => (
                  <TableRow key={l.indice}>
                    <TableCell className="py-2">
                      <Checkbox
                        checked={l.incluida}
                        disabled={l.classificacao === 'erro'}
                        onCheckedChange={() =>
                          setPreview((p) =>
                            p.map((x) => (x.indice === l.indice ? { ...x, incluida: !x.incluida } : x))
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="truncate text-sm font-medium">{l.nome || '(sem nome)'}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {l.email || l.motivoErro}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${COR_CLASSIFICACAO[l.classificacao]}`}
                      >
                        {ROTULO_CLASSIFICACAO[l.classificacao]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setPasso(2)}>
              Voltar
            </Button>
            <Button onClick={confirmar} disabled={totalIncluido === 0 || carregando}>
              {carregando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirmar importação de {totalIncluido.toLocaleString('pt-BR')}
            </Button>
          </div>
        </div>
      )}

      {passo === 4 && resultado && (
        <div className="space-y-4 rounded-lg border bg-card p-5 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="text-lg font-semibold">Importação concluída</p>
          <div className="flex justify-center gap-4 text-sm">
            <span>
              <strong className="tabular-nums">{resultado.criados}</strong> conta(s) nova(s)
            </span>
            <span>
              <strong className="tabular-nums">{resultado.casados}</strong> já existia(m)
            </span>
            {resultado.ignorados > 0 && (
              <span className="text-muted-foreground">
                <strong className="tabular-nums">{resultado.ignorados}</strong> ignorada(s)
              </span>
            )}
          </div>
          <Link href={`/admin/reativacao?incluirTags=${resultado.tagId}`}>
            <Button>
              <ArrowRight className="mr-2 h-4 w-4" />
              Ver na reativação
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
