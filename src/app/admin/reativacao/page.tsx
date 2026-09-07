'use client'

/**
 * Quem esta na base, em que estado, e por que.
 *
 * A tela existe antes do disparo de proposito. Segmentacao errada so aparece
 * depois que a mensagem saiu, e reativacao mal feita nao volta atras — entao a
 * primeira versao do painel serve para desconfiar da classificacao, nao para
 * confiar nela: cada linha abre e mostra a cadeia de fatos que produziu o rotulo.
 *
 * O estado vem de rastro de uso, que mede USO e nao acesso. Quem entra no app e
 * sai sem pesquisar, baixar nem criar nada nao deixa linha nenhuma. Por isso o
 * aviso do topo fica na tela, e nao numa documentacao que ninguem abre.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
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

const COR_ESTADO: Record<Estado, string> = {
  ativo: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  dormente: 'bg-amber-100 text-amber-900 border-amber-200',
  explorador: 'bg-sky-100 text-sky-900 border-sky-200',
  frio: 'bg-slate-100 text-slate-700 border-slate-200',
  trial: 'bg-violet-100 text-violet-900 border-violet-200',
  nunca_acessou: 'bg-rose-100 text-rose-900 border-rose-200'
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

function alterna<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
}

function dataCurta(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function ReativacaoPage() {
  const [corte, setCorte] = useState(CORTE_PADRAO_DIAS)
  const [estados, setEstados] = useState<Estado[]>([])
  const [incluir, setIncluir] = useState<Origem[]>([])
  const [excluir, setExcluir] = useState<Origem[]>([])
  const [semIdioma, setSemIdioma] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [pagina, setPagina] = useState(0)

  const [dados, setDados] = useState<ResultadoPublico | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aberta, setAberta] = useState<string | null>(null)

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

  // Trocar filtro com a paginação avançada mostraria uma página vazia sem
  // explicação nenhuma. Volta para a primeira sempre que o recorte muda.
  useEffect(() => {
    setPagina(0)
  }, [corte, estados, incluir, excluir, semIdioma, buscaAtiva])

  const totalGeral = useMemo(
    () =>
      dados ? ESTADOS.reduce((s, e) => s + (dados.contagens[e] ?? 0), 0) : 0,
    [dados]
  )

  const temFiltro =
    estados.length > 0 ||
    incluir.length > 0 ||
    excluir.length > 0 ||
    semIdioma ||
    Boolean(buscaAtiva)

  const paginaAtual = dados?.items ?? []
  const ultimaPagina = dados ? (pagina + 1) * POR_PAGINA >= dados.total : true

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Público da reativação
          </h1>
          <p className="text-sm text-muted-foreground">
            Quem está na base, em que estado, e por que foi classificado assim.
          </p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={carregando}>
          {carregando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">O estado vem de rastro de uso, não de acesso.</p>
          <p>
            Não existe registro de último acesso no banco. O que existe são rastros
            — conversa, download na biblioteca, descoberta, pasta de sintoma,
            lembrete. Quem entra no app e sai sem fazer nada disso não deixa linha,
            e aparece aqui como se tivesse sumido. Na base inteira isso são 72
            pessoas; numa campanha de reativação tende a crescer, porque é
            exatamente o que uma isca produz.
          </p>
        </div>
      </div>

      {erro && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ESTADOS.map((e) => {
          const selecionado = estados.includes(e)
          const foraDaReativacao = ESTADOS_FORA_DA_REATIVACAO.includes(e)
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEstados((s) => alterna(s, e))}
              className={`rounded-md border p-3 text-left transition ${
                selecionado
                  ? 'border-foreground bg-muted'
                  : 'border-border hover:border-foreground/40'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{ROTULO_ESTADO[e]}</span>
                <span className="tabular-nums text-lg font-semibold">
                  {dados ? (dados.contagens[e] ?? 0).toLocaleString('pt-BR') : '—'}
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {DESCRICAO_ESTADO[e]}
              </p>
              {foraDaReativacao && (
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                  sempre exclusão
                </p>
              )}
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Incluir e excluir por origem. É a regra que o plano chama de mais
            importante — sem exclusão o painel trava em três meses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Corte de inatividade (dias)
              </label>
              <Input
                type="number"
                min={1}
                value={corte}
                onChange={(ev) => setCorte(Math.max(1, Number(ev.target.value) || 1))}
                className="w-40"
              />
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault()
                setBuscaAtiva(busca.trim())
              }}
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  E-mail ou nome
                </label>
                <Input
                  value={busca}
                  onChange={(ev) => setBusca(ev.target.value)}
                  placeholder="buscar…"
                  className="w-64"
                />
              </div>
              <Button type="submit" variant="secondary">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </form>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={semIdioma}
                onChange={(ev) => setSemIdioma(ev.target.checked)}
                className="h-4 w-4"
              />
              Só quem está sem idioma marcado
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Incluir origem
              </p>
              <div className="flex flex-wrap gap-2">
                {ORIGENS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    disabled={excluir.includes(o)}
                    onClick={() => setIncluir((s) => alterna(s, o))}
                    className={`rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      incluir.includes(o)
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground/50'
                    }`}
                  >
                    {ROTULO_ORIGEM[o]}
                    {ORIGENS_SEM_FONTE.includes(o) && ' ·  sem fonte'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Excluir origem
              </p>
              <div className="flex flex-wrap gap-2">
                {ORIGENS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    disabled={incluir.includes(o)}
                    onClick={() => setExcluir((s) => alterna(s, o))}
                    className={`rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      excluir.includes(o)
                        ? 'border-destructive bg-destructive text-destructive-foreground'
                        : 'border-border hover:border-foreground/50'
                    }`}
                  >
                    {ROTULO_ORIGEM[o]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Aluno</strong> e <strong>ex-aluno</strong> aparecem sem fonte de
            propósito: a formação vive em outra plataforma e nunca foi importada,
            então filtrar por elas devolve zero. Estão aqui para o vocabulário já
            nascer certo, e some quando a importação existir.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {dados ? dados.total.toLocaleString('pt-BR') : '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              {temFiltro
                ? `pessoas batem no filtro, de ${totalGeral.toLocaleString('pt-BR')} na base`
                : 'pessoas na base'}
            </p>
          </div>
        </div>
        {temFiltro && (
          <Button
            variant="ghost"
            onClick={() => {
              setEstados([])
              setIncluir([])
              setExcluir([])
              setSemIdioma(false)
              setBusca('')
              setBuscaAtiva('')
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último rastro</TableHead>
                <TableHead>Origens</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando && paginaAtual.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!carregando && paginaAtual.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Ninguém bate nesse recorte.
                  </TableCell>
                </TableRow>
              )}
              {paginaAtual.map((l) => (
                <LinhaPessoa
                  key={l.userId}
                  linha={l}
                  corte={dados?.corte ?? corte}
                  aberta={aberta === l.userId}
                  onToggle={() => setAberta((a) => (a === l.userId ? null : l.userId))}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {dados && dados.total > 0
            ? `${pagina * POR_PAGINA + 1}–${Math.min((pagina + 1) * POR_PAGINA, dados.total)} de ${dados.total.toLocaleString('pt-BR')}`
            : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina === 0 || carregando}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={ultimaPagina || carregando}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function LinhaPessoa({
  linha,
  corte,
  aberta,
  onToggle
}: {
  linha: LinhaPublico
  corte: number
  aberta: boolean
  onToggle: () => void
}) {
  const fatos = explicarEstado(linha, corte)
  const [historico, setHistorico] = useState<Historico | null>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Carrega so quando a linha abre. Puxar isto para as 50 linhas da pagina
  // seriam 350 consultas por uma informacao que quase sempre ninguem olha.
  useEffect(() => {
    if (!aberta || historico || carregandoHistorico) return
    setCarregandoHistorico(true)
    fetch(`/api/admin/reativacao/${linha.userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setHistorico(j))
      .catch(() => setHistorico(null))
      .finally(() => setCarregandoHistorico(false))
  }, [aberta, historico, carregandoHistorico, linha.userId])

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <div className="font-medium">{linha.nome || '(sem nome)'}</div>
          <div className="text-xs text-muted-foreground">{linha.email}</div>
        </TableCell>
        <TableCell>
          <span
            className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${COR_ESTADO[linha.estado]}`}
          >
            {ROTULO_ESTADO[linha.estado]}
          </span>
        </TableCell>
        <TableCell className="text-sm">
          {linha.ultimoSinalEm ? (
            <>
              <div className="tabular-nums">
                {linha.diasSemSinal} dia(s) · {dataCurta(linha.ultimoSinalEm)}
              </div>
              <div className="text-xs text-muted-foreground">
                {ROTULO_FONTE[linha.ultimaFonte ?? ''] ?? linha.ultimaFonte}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">sem rastro</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {linha.origens.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {linha.origens.map((o) => (
              <Badge key={o} variant="secondary" className="text-[11px]">
                {ROTULO_ORIGEM[o]}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="text-sm">
          {linha.idioma || <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell>
          {aberta ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
      </TableRow>
      {aberta && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="py-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Por que {ROTULO_ESTADO[linha.estado]}
                </p>
                <ul className="space-y-1 text-sm">
                  {fatos.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 text-xs text-muted-foreground">
                  Conta criada em {dataCurta(linha.contaCriadaEm)}
                  {linha.primeiroAcessoEm &&
                    ` · primeiro acesso em ${dataCurta(linha.primeiroAcessoEm)}`}
                  {linha.whatsapp && ` · WhatsApp ${linha.whatsapp}`}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  De onde vêm as origens
                </p>
                {linha.evidencias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma compra registrada. Só existe como conta no app — o que
                    também acontece com quem comprou antes de 17/08/2026, quando o
                    registro de vendas passou a existir.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {linha.evidencias.map((e, i) => (
                      <li key={i}>
                        <span className="font-medium">{ROTULO_ORIGEM[e.origem]}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          — {e.produto}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {e.fonte} · {dataCurta(e.em)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {historico && historico.acessos.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Acessos liberados
                    </p>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {historico.acessos.map((a, i) => (
                        <li key={i}>
                          {a.produto || '(produto removido do catálogo)'}
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            · {a.tipo || 'sem tipo'} · desde {dataCurta(a.liberadoEm)}
                            {a.source ? ` · via ${a.source}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {historico && historico.avisos.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Avisos de acesso
                    </p>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {historico.avisos.map((a, i) => (
                        <li key={i}>
                          <span
                            className={
                              a.status === 'failed'
                                ? 'font-medium text-destructive'
                                : 'text-muted-foreground'
                            }
                          >
                            {a.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            · {a.kind} · {dataCurta(a.enviadoEm ?? a.criadoEm)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Linha do tempo
                </p>
                {carregandoHistorico && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!carregandoHistorico && !historico && (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível carregar o histórico.
                  </p>
                )}
                {historico && historico.atividade.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma ação registrada. É o que sustenta a classificação — e
                    também o que pode estar faltando, se a pessoa entrou e só olhou.
                  </p>
                )}
                {historico && historico.atividade.length > 0 && (
                  <>
                    <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-2 text-sm">
                      {historico.atividade.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="w-20 shrink-0 tabular-nums text-xs text-muted-foreground">
                            {dataCurta(a.em)}
                          </span>
                          <span>
                            {ROTULO_FONTE[a.tipo] ?? a.tipo}
                            {a.detalhe && (
                              <span className="text-muted-foreground"> · {a.detalhe}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                    {historico.truncado && (
                      <p className="text-xs text-muted-foreground">
                        Mostrando as 40 ações mais recentes.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
