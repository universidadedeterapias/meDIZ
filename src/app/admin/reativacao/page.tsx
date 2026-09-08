'use client'

/**
 * Quem esta na base, em que estado, e por que.
 *
 * A tela existe antes do disparo de proposito. Segmentacao errada so aparece
 * depois que a mensagem saiu, e reativacao mal feita nao volta atras — entao ela
 * serve para desconfiar da classificacao, nao para confiar nela.
 *
 * Tres decisoes de desenho que valem explicacao:
 *
 * 1. Origem e tri-state (neutro -> incluir -> excluir). A versao anterior tinha
 *    duas listas com os mesmos oito rotulos, uma para incluir e outra para
 *    excluir: dezesseis controles para oito conceitos, e nada indicando que as
 *    listas eram exclusivas entre si.
 * 2. O detalhe abre em painel lateral, e nao expandindo a linha. Expandir
 *    empurrava as demais para fora da tela justamente quando se esta comparando.
 * 3. Cor por tag existe para varredura, nao decoracao: a coluna de origens so
 *    informa de relance se cada origem tiver a mesma cor toda vez.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CriarOndaDialog } from '@/components/admin/CriarOndaDialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  CORTE_PADRAO_DIAS,
  DESCRICAO_ESTADO,
  ESTADOS,
  ESTADOS_FORA_DA_REATIVACAO,
  ORIGENS,
  ORIGENS_SEM_FONTE,
  ROTULO_ESTADO,
  ROTULO_FONTE,
  ROTULO_ORIGEM,
  explicarEstado,
  type Estado,
  type LinhaPublico,
  type Origem,
  type ResultadoPublico
} from '@/lib/reativacao/tipos'

const POR_PAGINA = 50
const CORTES_RAPIDOS = [7, 30, 60, 90]

/** Cada estado tem uma cor fixa. O ponto colorido carrega o significado na
 *  tabela, onde nao cabe o rotulo inteiro. */
const CORES_ESTADO: Record<Estado, { pill: string; ponto: string; texto: string }> = {
  ativo: {
    pill: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    ponto: 'bg-emerald-500',
    texto: 'text-emerald-700'
  },
  dormente: {
    pill: 'border-amber-300 bg-amber-50 text-amber-900',
    ponto: 'bg-amber-500',
    texto: 'text-amber-700'
  },
  explorador: {
    pill: 'border-sky-300 bg-sky-50 text-sky-900',
    ponto: 'bg-sky-500',
    texto: 'text-sky-700'
  },
  frio: {
    pill: 'border-slate-300 bg-slate-50 text-slate-700',
    ponto: 'bg-slate-400',
    texto: 'text-slate-600'
  },
  trial: {
    pill: 'border-violet-300 bg-violet-50 text-violet-900',
    ponto: 'bg-violet-500',
    texto: 'text-violet-700'
  },
  nunca_acessou: {
    pill: 'border-rose-300 bg-rose-50 text-rose-900',
    ponto: 'bg-rose-500',
    texto: 'text-rose-700'
  }
}

/** Cor por origem. Cinza para as duas que ainda nao tem fonte: elas precisam
 *  parecer diferentes das reais, e nao competir por atencao. */
const CORES_ORIGEM: Record<Origem, string> = {
  livro_corpo_diz: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  guia_sentido_biologico: 'border-amber-200 bg-amber-50 text-amber-800',
  audioterapia: 'border-violet-200 bg-violet-50 text-violet-800',
  curso: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  assinatura: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  aluno: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  ex_aluno: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  outro: 'border-zinc-200 bg-zinc-100 text-zinc-700'
}

const CORES_ORIGEM_CHEIA: Record<Origem, string> = {
  livro_corpo_diz: 'border-indigo-600 bg-indigo-600 text-white',
  guia_sentido_biologico: 'border-amber-600 bg-amber-600 text-white',
  audioterapia: 'border-violet-600 bg-violet-600 text-white',
  curso: 'border-cyan-600 bg-cyan-600 text-white',
  assinatura: 'border-emerald-600 bg-emerald-600 text-white',
  aluno: 'border-zinc-500 bg-zinc-500 text-white',
  ex_aluno: 'border-zinc-500 bg-zinc-500 text-white',
  outro: 'border-zinc-600 bg-zinc-600 text-white'
}

type EstadoDoFiltro = 'neutro' | 'incluir' | 'excluir'

const PROXIMO: Record<EstadoDoFiltro, EstadoDoFiltro> = {
  neutro: 'incluir',
  incluir: 'excluir',
  excluir: 'neutro'
}

type Historico = {
  atividade: { tipo: string; em: string | null; detalhe: string | null }[]
  acessos: {
    produto: string | null
    tipo: string | null
    source: string | null
    liberadoEm: string | null
  }[]
  avisos: {
    kind: string
    status: string
    provider: string | null
    criadoEm: string | null
    enviadoEm: string | null
  }[]
  truncado: boolean
}

function dataCurta(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function haQuantoTempo(dias: number | null): string {
  if (dias === null) return 'sem rastro'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`
  return `há ${Math.floor(dias / 365)} ano(s)`
}

export default function ReativacaoPage() {
  const [corte, setCorte] = useState(CORTE_PADRAO_DIAS)
  const [estados, setEstados] = useState<Estado[]>([])
  const [origens, setOrigens] = useState<Record<string, EstadoDoFiltro>>({})
  const [semIdioma, setSemIdioma] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [pagina, setPagina] = useState(0)
  const [avisoAberto, setAvisoAberto] = useState(false)

  const [dados, setDados] = useState<ResultadoPublico | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState<LinhaPublico | null>(null)
  const [criando, setCriando] = useState(false)

  const incluir = useMemo(
    () => ORIGENS.filter((o) => origens[o] === 'incluir'),
    [origens]
  )
  const excluir = useMemo(
    () => ORIGENS.filter((o) => origens[o] === 'excluir'),
    [origens]
  )

  // Busca sem botao: digitar e esperar e menos trabalho que digitar e confirmar.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca.trim()), 400)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    const p = new URLSearchParams({
      corte: String(corte),
      limit: String(POR_PAGINA),
      offset: String(pagina * POR_PAGINA)
    })
    if (estados.length) p.set('estado', estados.join(','))
    if (incluir.length) p.set('incluir', incluir.join(','))
    if (excluir.length) p.set('excluir', excluir.join(','))
    if (semIdioma) p.set('semIdioma', '1')
    if (buscaAtiva) p.set('busca', buscaAtiva)

    try {
      const res = await fetch(`/api/admin/reativacao?${p.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Falha ao carregar.')
        setDados(null)
        return
      }
      setDados(json)
    } catch {
      setErro('Não foi possível falar com o servidor.')
      setDados(null)
    } finally {
      setCarregando(false)
    }
  }, [corte, estados, incluir, excluir, semIdioma, buscaAtiva, pagina])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Trocar o recorte com a paginacao avancada mostraria pagina vazia sem
  // explicacao. Volta para a primeira sempre que o filtro muda.
  useEffect(() => {
    setPagina(0)
  }, [corte, estados, incluir, excluir, semIdioma, buscaAtiva])

  const totalGeral = dados
    ? ESTADOS.reduce((s, e) => s + (dados.contagens[e] ?? 0), 0)
    : 0

  const temFiltro =
    estados.length > 0 ||
    incluir.length > 0 ||
    excluir.length > 0 ||
    semIdioma ||
    Boolean(buscaAtiva)

  const limpar = () => {
    setEstados([])
    setOrigens({})
    setSemIdioma(false)
    setBusca('')
    setBuscaAtiva('')
    setCorte(CORTE_PADRAO_DIAS)
  }

  const filtrosAtuais = useMemo(
    () => ({
      corte,
      estados,
      incluirOrigens: incluir,
      excluirOrigens: excluir,
      idiomas: [] as string[],
      semIdioma,
      busca: buscaAtiva || null,
      limit: POR_PAGINA,
      offset: 0
    }),
    [corte, estados, incluir, excluir, semIdioma, buscaAtiva]
  )

  const linhas = dados?.items ?? []
  const ultimaPagina = dados ? (pagina + 1) * POR_PAGINA >= dados.total : true

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Público da reativação
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAvisoAberto((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100"
          >
            <Info className="h-3.5 w-3.5" />
            O estado vem de rastro de uso
          </button>
          <Button variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {avisoAberto && (
        <div className="rounded-md border border-amber-200 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-900">
          Não existe registro de último acesso no banco. O que existe são rastros —
          conversa, download na biblioteca, descoberta, pasta de sintoma, lembrete.
          Quem entra no app e sai sem fazer nada disso não deixa linha, e aparece
          aqui como se tivesse sumido. Na base inteira isso são 72 pessoas; numa
          campanha tende a crescer, porque é exatamente o que uma isca produz.
        </div>
      )}

      {erro && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[248px_1fr]">
        {/* ---------- rail de filtros ---------- */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="E-mail ou nome"
                className="h-9 pl-8 pr-8 text-sm"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Corte de inatividade
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CORTES_RAPIDOS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setCorte(d)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    corte === d
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
              <Input
                type="number"
                min={1}
                value={corte}
                onChange={(e) => setCorte(Math.max(1, Number(e.target.value) || 1))}
                className="h-7 w-16 text-xs"
                aria-label="Corte personalizado em dias"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Origem
              </p>
              {(incluir.length > 0 || excluir.length > 0) && (
                <button
                  type="button"
                  onClick={() => setOrigens({})}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  limpar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {ORIGENS.map((o) => {
                const modo = origens[o] ?? 'neutro'
                const semFonte = ORIGENS_SEM_FONTE.includes(o)
                return (
                  <button
                    key={o}
                    type="button"
                    title={
                      modo === 'neutro'
                        ? 'Clique para incluir'
                        : modo === 'incluir'
                          ? 'Incluindo · clique para excluir'
                          : 'Excluindo · clique para limpar'
                    }
                    onClick={() =>
                      setOrigens((s) => ({ ...s, [o]: PROXIMO[s[o] ?? 'neutro'] }))
                    }
                    className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      modo === 'incluir'
                        ? CORES_ORIGEM_CHEIA[o]
                        : modo === 'excluir'
                          ? 'border-destructive/50 bg-destructive/5 text-destructive line-through'
                          : `${CORES_ORIGEM[o]} opacity-80 hover:opacity-100`
                    }`}
                  >
                    <span>{ROTULO_ORIGEM[o]}</span>
                    <span className="ml-2 text-[10px] font-normal opacity-70">
                      {modo === 'incluir' ? 'incluir' : modo === 'excluir' ? 'excluir' : semFonte ? 'sem fonte' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="pt-0.5 text-[11px] leading-snug text-muted-foreground">
              Um clique inclui, dois excluem, três limpam.{' '}
              <strong className="font-medium">Aluno</strong> e{' '}
              <strong className="font-medium">ex-aluno</strong> devolvem zero: a
              formação vive em outra plataforma e nunca foi importada.
            </p>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={semIdioma}
              onChange={(e) => setSemIdioma(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Sem idioma marcado
          </label>

          {temFiltro && (
            <Button variant="ghost" size="sm" className="w-full" onClick={limpar}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Limpar tudo
            </Button>
          )}
        </aside>

        {/* ---------- conteudo ---------- */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {ESTADOS.map((e) => {
              const ativo = estados.includes(e)
              const cor = CORES_ESTADO[e]
              return (
                <button
                  key={e}
                  type="button"
                  title={DESCRICAO_ESTADO[e]}
                  onClick={() =>
                    setEstados((s) =>
                      s.includes(e) ? s.filter((x) => x !== e) : [...s, e]
                    )
                  }
                  className={`rounded-lg border p-2.5 text-left transition-all ${
                    ativo
                      ? `${cor.pill} ring-2 ring-offset-1 ring-current`
                      : 'border-border bg-card hover:border-foreground/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cor.ponto}`} />
                    <span className="truncate text-[11px] font-medium">
                      {ROTULO_ESTADO[e]}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {dados ? (dados.contagens[e] ?? 0).toLocaleString('pt-BR') : '—'}
                  </p>
                  {ESTADOS_FORA_DA_REATIVACAO.includes(e) && (
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      sempre exclusão
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
              <p className="text-sm">
                <span className="text-lg font-semibold tabular-nums">
                  {dados ? dados.total.toLocaleString('pt-BR') : '—'}
                </span>
                <span className="ml-1.5 text-muted-foreground">
                  {temFiltro
                    ? `de ${totalGeral.toLocaleString('pt-BR')} pessoas`
                    : 'pessoas'}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  corte de {dados?.corte ?? corte} dias
                </span>
                <Button
                  size="sm"
                  disabled={!dados || dados.total === 0 || estados.length === 0}
                  title={
                    estados.length === 0
                      ? 'Escolha ao menos um estado — uma onda sem recorte é a base inteira'
                      : 'Congela esta lista numa onda de reativação'
                  }
                  onClick={() => setCriando(true)}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Criar onda
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Pessoa</TableHead>
                  <TableHead className="h-9 w-36 text-xs">Estado</TableHead>
                  <TableHead className="h-9 w-40 text-xs">Último rastro</TableHead>
                  <TableHead className="h-9 text-xs">Origens</TableHead>
                  <TableHead className="h-9 w-20 text-xs">Idioma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`s${i}`}>
                      <TableCell colSpan={5} className="py-2.5">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!carregando && linhas.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-14 text-center text-sm text-muted-foreground"
                    >
                      Ninguém bate nesse recorte.
                      {temFiltro && (
                        <button
                          type="button"
                          onClick={limpar}
                          className="ml-1 underline underline-offset-2 hover:text-foreground"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )}

                {!carregando &&
                  linhas.map((l) => {
                    const cor = CORES_ESTADO[l.estado]
                    return (
                      <TableRow
                        key={l.userId}
                        onClick={() => setSelecionada(l)}
                        className="cursor-pointer"
                      >
                        <TableCell className="py-2">
                          <div className="truncate text-sm font-medium">
                            {l.nome || '(sem nome)'}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {l.email}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cor.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${cor.ponto}`} />
                            {ROTULO_ESTADO[l.estado]}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-sm">{haQuantoTempo(l.diasSemSinal)}</div>
                          {l.ultimaFonte && (
                            <div className="truncate text-xs text-muted-foreground">
                              {ROTULO_FONTE[l.ultimaFonte] ?? l.ultimaFonte}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {l.origens.length === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {l.origens.map((o) => (
                              <span
                                key={o}
                                className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${CORES_ORIGEM[o]}`}
                              >
                                {ROTULO_ORIGEM[o]}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {l.idioma || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>

            {dados && dados.total > POR_PAGINA && (
              <div className="flex items-center justify-between border-t px-4 py-2.5">
                <p className="text-xs tabular-nums text-muted-foreground">
                  {pagina * POR_PAGINA + 1}–
                  {Math.min((pagina + 1) * POR_PAGINA, dados.total)} de{' '}
                  {dados.total.toLocaleString('pt-BR')}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina === 0 || carregando}
                    onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ultimaPagina || carregando}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CriarOndaDialog
        aberto={criando}
        onClose={() => setCriando(false)}
        filtros={filtrosAtuais}
        total={dados?.total ?? 0}
        onCriada={(id) => {
          setCriando(false)
          window.location.href = `/admin/reativacao/campanhas?nova=${id}`
        }}
      />

      <PainelPessoa
        linha={selecionada}
        corte={dados?.corte ?? corte}
        onClose={() => setSelecionada(null)}
      />
    </div>
  )
}

/**
 * O detalhe, em painel lateral.
 *
 * Carregado sob demanda: puxar historico para as 50 linhas da pagina seriam 350
 * consultas por uma informacao que quase sempre ninguem olha.
 */
function PainelPessoa({
  linha,
  corte,
  onClose
}: {
  linha: LinhaPublico | null
  corte: number
  onClose: () => void
}) {
  const [historico, setHistorico] = useState<Historico | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!linha) return
    setHistorico(null)
    setCarregando(true)
    let cancelado = false
    fetch(`/api/admin/reativacao/${linha.userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelado) setHistorico(j)
      })
      .catch(() => {
        if (!cancelado) setHistorico(null)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [linha])

  if (!linha) return null

  const cor = CORES_ESTADO[linha.estado]
  const fatos = explicarEstado(linha, corte)

  return (
    <Sheet open={Boolean(linha)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="text-lg">{linha.nome || '(sem nome)'}</SheetTitle>
          <SheetDescription className="break-all">{linha.email}</SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cor.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cor.ponto}`} />
              {ROTULO_ESTADO[linha.estado]}
            </span>
            {linha.origens.map((o) => (
              <span
                key={o}
                className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${CORES_ORIGEM[o]}`}
              >
                {ROTULO_ORIGEM[o]}
              </span>
            ))}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Secao titulo={`Por que ${ROTULO_ESTADO[linha.estado]}`}>
            <ul className="space-y-1.5 text-sm">
              {fatos.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${cor.ponto}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>
                <dt className="inline">Conta criada: </dt>
                <dd className="inline tabular-nums">{dataCurta(linha.contaCriadaEm)}</dd>
              </div>
              {linha.primeiroAcessoEm && (
                <div>
                  <dt className="inline">Primeiro acesso: </dt>
                  <dd className="inline tabular-nums">
                    {dataCurta(linha.primeiroAcessoEm)}
                  </dd>
                </div>
              )}
              {linha.whatsapp && (
                <div>
                  <dt className="inline">WhatsApp: </dt>
                  <dd className="inline tabular-nums">{linha.whatsapp}</dd>
                </div>
              )}
              <div>
                <dt className="inline">Idioma: </dt>
                <dd className="inline">{linha.idioma || 'não marcado'}</dd>
              </div>
            </dl>
          </Secao>

          {carregando && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {historico && historico.acessos.length > 0 && (
            <Secao titulo="Acessos liberados">
              <ul className="space-y-2 text-sm">
                {historico.acessos.map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {a.produto || '(produto removido do catálogo)'}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {dataCurta(a.liberadoEm)}
                    </span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {historico && historico.avisos.length > 0 && (
            <Secao titulo="Avisos de acesso">
              <ul className="space-y-1.5 text-sm">
                {historico.avisos.map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span
                      className={
                        a.status === 'failed'
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground'
                      }
                    >
                      {a.status} · {a.kind}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {dataCurta(a.enviadoEm ?? a.criadoEm)}
                    </span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {historico && (
            <Secao titulo="Linha do tempo">
              {historico.atividade.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ação registrada. É o que sustenta a classificação — e
                  também o que pode estar faltando, se a pessoa entrou e só olhou.
                </p>
              ) : (
                <>
                  <ol className="space-y-0">
                    {historico.atividade.map((a, i) => (
                      <li key={i} className="flex gap-3 border-l pl-3 pb-3 last:pb-0">
                        <span className="w-[68px] shrink-0 text-xs tabular-nums text-muted-foreground">
                          {dataCurta(a.em)}
                        </span>
                        <span className="min-w-0 text-sm">
                          {ROTULO_FONTE[a.tipo] ?? a.tipo}
                          {a.detalhe && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {a.detalhe}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {historico.truncado && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      Mostrando as 40 ações mais recentes.
                    </p>
                  )}
                </>
              )}
            </Secao>
          )}

          {!carregando && !historico && (
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o histórico.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Secao({
  titulo,
  children
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </section>
  )
}
