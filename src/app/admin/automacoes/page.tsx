'use client'

/**
 * Automacoes (Story 6.4): o que saiu pelo portao de envio, o estado de cada
 * fluxo no n8n, os alertas do vigia e o freio de cada fluxo.
 *
 * Os dados vem do registro do portao (`mensagens_enviadas`), da tabela de
 * fluxos (`fluxos_automacao`), dos alertas (`alertas_automacao`) e da API do
 * n8n. Desligar um fluxo aqui nao para o workflow: tudo o que ele tentar
 * mandar volta `barrado`, e ninguem e perdido.
 */

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminChartAxisStroke, adminChartAxisTick, adminChartGridProps, adminChartTooltipProps } from '@/components/admin/chart-theme'

type EstadoN8n = {
  ativo: boolean
  ultimaExecucao: string | null
  ultimoStatus: string | null
  errosUltimas24h: number
  url: string
}

type Fluxo = {
  fluxo: string
  nome: string
  ligado: boolean
  tetoDiario: number
  limitePessoa24h: number
  contaNoLimitePessoa: boolean
  atualizadoPor: string | null
  atualizadoEm: string
  hoje: { enviado: number; barrado: number; falhou: number; incerto: number; ocupaTeto: number }
  ultimoEnvio: string | null
  n8n: EstadoN8n | null
}

type Alerta = {
  chave: string
  titulo: string
  gravidade: string
  detalhe: string | null
  vezes: number
  primeiraVezEm: string
  ultimaVezEm: string
}

type Painel = {
  geradoEm: string
  hoje: { enviado: number; barrado: number; falhou: number; incerto: number; porCategoria: Record<string, number> }
  porDia: Array<Record<string, number | string>>
  fluxos: Fluxo[]
  alertas: Alerta[]
  alertasAbertos: number
  n8nDisponivel: boolean
  erroN8n: string | null
}

type Mensagem = {
  id: string
  chave: string
  fluxo: string
  telefone: string
  template: string
  categoria: string | null
  status: string
  motivo: string | null
  tentativas: number
  tentativaEm: string
  enviadoEm: string | null
  n8nWorkflowId: string | null
  n8nExecucaoId: string | null
}

const CORES_FLUXO: Record<string, string> = {
  entrega_acesso: '#2563eb',
  rastreio_livro: '#0891b2',
  trial_fim: '#7c3aed',
  despertadores: '#db2777',
  recuperacao: '#ea580c',
  reativacao: '#16a34a'
}

const CORES_STATUS: Record<string, string> = {
  enviado: 'bg-emerald-100 text-emerald-700',
  reservado: 'bg-blue-100 text-blue-700',
  barrado: 'bg-amber-100 text-amber-800',
  falhou: 'bg-red-100 text-red-700',
  incerto: 'bg-red-100 text-red-700'
}

const N8N_URL = 'https://mediz-n8n.gjhi7d.easypanel.host'

function quando(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function haQuanto(iso: string | null): string {
  if (!iso) return 'nunca'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 48 * 60) return `há ${Math.round(min / 60)} h`
  return `há ${Math.round(min / 1440)} dias`
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: 'ruim' | 'atencao' }) {
  const cor = destaque === 'ruim' && valor > 0 ? 'text-red-600' : destaque === 'atencao' && valor > 0 ? 'text-amber-600' : ''
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{rotulo}</p>
        <p className={`text-3xl font-semibold tabular-nums ${cor}`}>{valor}</p>
      </CardContent>
    </Card>
  )
}

function LinhaDoFluxo({ f, aoSalvar }: { f: Fluxo; aoSalvar: () => void }) {
  const [teto, setTeto] = useState(String(f.tetoDiario))
  const [limite, setLimite] = useState(String(f.limitePessoa24h))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setTeto(String(f.tetoDiario))
    setLimite(String(f.limitePessoa24h))
  }, [f.tetoDiario, f.limitePessoa24h])

  const salvar = async (dados: Record<string, unknown>, sucesso: string) => {
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/admin/automacoes/fluxos/${f.fluxo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      toast.success(sucesso)
      aoSalvar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar'
      setErro(msg)
      toast.error(`${f.nome}: não foi possível salvar — ${msg}`)
    } finally {
      setSalvando(false)
    }
  }

  const alternar = (ligado: boolean) => {
    if (
      !ligado &&
      !window.confirm(
        `Desligar o envio de "${f.nome}"? O workflow continua rodando no n8n, mas toda mensagem volta barrada até você religar.`
      )
    )
      return
    salvar({ ligado }, ligado ? `${f.nome}: envio ligado` : `${f.nome}: envio desligado — tudo volta barrado até religar`)
  }

  const tetoMudou = teto !== String(f.tetoDiario) || limite !== String(f.limitePessoa24h)
  const uso = f.tetoDiario > 0 ? Math.min(100, Math.round((f.hoje.ocupaTeto / f.tetoDiario) * 100)) : 0
  const n8n = f.n8n

  return (
    <TableRow>
      <TableCell className="min-w-[180px]">
        <p className="font-medium">{f.nome}</p>
        <p className="text-xs text-muted-foreground">{f.fluxo}</p>
        {!f.contaNoLimitePessoa && <p className="text-xs text-muted-foreground">mensagem pedida: fora do limite por pessoa</p>}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={f.ligado} onCheckedChange={alternar} disabled={salvando} aria-label={`Envio de ${f.nome}`} />
          <span className={f.ligado ? 'text-sm' : 'text-sm font-medium text-red-600'}>{f.ligado ? 'Ligado' : 'Desligado'}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-[160px]">
        <p className="text-sm tabular-nums">
          {f.hoje.ocupaTeto} de {f.tetoDiario}
        </p>
        <div className="mt-1 h-1.5 w-full rounded bg-muted">
          <div
            className={`h-1.5 rounded ${uso >= 100 ? 'bg-red-500' : uso >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${uso}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {[f.hoje.barrado && `${f.hoje.barrado} barrada(s)`, f.hoje.falhou && `${f.hoje.falhou} falha(s)`, f.hoje.incerto && `${f.hoje.incerto} sem confirmação`]
            .filter(Boolean)
            .join(' · ') || 'sem barradas ou falhas'}
        </p>
      </TableCell>
      <TableCell className="min-w-[210px]">
        <div className="flex items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Teto/dia
            <Input
              type="number"
              min={0}
              value={teto}
              onChange={(e) => setTeto(e.target.value)}
              className="mt-1 h-8 w-20"
              id={`teto-${f.fluxo}`}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Por pessoa/24h
            <Input
              type="number"
              min={1}
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              className="mt-1 h-8 w-16"
              id={`limite-${f.fluxo}`}
            />
          </label>
          {tetoMudou && (
            <Button
              size="sm"
              disabled={salvando}
              onClick={() =>
                salvar(
                  { tetoDiario: Number(teto), limitePessoa24h: Number(limite) },
                  `${f.nome}: teto de ${teto}/dia e ${limite} por pessoa em 24h`
                )
              }
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          )}
        </div>
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
        {f.atualizadoPor && (
          <p className="mt-1 text-xs text-muted-foreground">
            alterado por {f.atualizadoPor} em {quando(f.atualizadoEm)}
          </p>
        )}
      </TableCell>
      <TableCell className="text-sm">{haQuanto(f.ultimoEnvio)}</TableCell>
      <TableCell className="min-w-[170px] text-sm">
        {!n8n ? (
          <span className="text-muted-foreground">sem dados do n8n</span>
        ) : (
          <div className="space-y-0.5">
            <a href={n8n.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              {n8n.ativo ? (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">ativo</Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">desligado</Badge>
              )}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-xs text-muted-foreground">
              última rodada {haQuanto(n8n.ultimaExecucao)}
              {n8n.ultimoStatus && n8n.ultimoStatus !== 'success' ? ` (${n8n.ultimoStatus})` : ''}
            </p>
            {n8n.errosUltimas24h > 0 && <p className="text-xs text-red-600">{n8n.errosUltimas24h} erro(s) em 24h</p>}
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

const POR_PAGINA = 25

export default function AutomacoesPage() {
  const [painel, setPainel] = useState<Painel | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [totalMensagens, setTotalMensagens] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [filtroFluxo, setFiltroFluxo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')

  const carregarPainel = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/automacoes', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPainel(await res.json())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar')
    } finally {
      setCarregando(false)
    }
  }, [])

  const carregarMensagens = useCallback(async () => {
    const q = new URLSearchParams({ offset: String(pagina * POR_PAGINA) })
    if (filtroFluxo) q.set('fluxo', filtroFluxo)
    if (filtroStatus) q.set('status', filtroStatus)
    if (buscaAplicada) q.set('busca', buscaAplicada)
    const res = await fetch(`/api/admin/automacoes/mensagens?${q}`, { cache: 'no-store' })
    if (!res.ok) return
    const d = await res.json()
    setMensagens(d.itens)
    setTotalMensagens(d.total)
  }, [pagina, filtroFluxo, filtroStatus, buscaAplicada])

  useEffect(() => {
    carregarPainel()
    const t = setInterval(carregarPainel, 60_000)
    return () => clearInterval(t)
  }, [carregarPainel])

  useEffect(() => {
    carregarMensagens()
  }, [carregarMensagens])

  const nomes = Object.fromEntries((painel?.fluxos ?? []).map((f) => [f.fluxo, f.nome]))
  const categorias = Object.entries(painel?.hoje.porCategoria ?? {})
  const diasComDado = (painel?.porDia ?? []).map((l) => ({ ...l, dia: String(l.dia).slice(8, 10) + '/' + String(l.dia).slice(5, 7) }))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="mr-1 h-4 w-4" /> Admin
          </Link>
          <h1 className="text-2xl font-semibold">Automações</h1>
          <p className="text-sm text-muted-foreground">
            Mensagens pagas que saíram pelo portão de envio, estado dos fluxos no n8n e alertas do vigia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {painel && <span className="text-xs text-muted-foreground">atualizado {haQuanto(painel.geradoEm)}</span>}
          <Button variant="outline" size="sm" onClick={() => { carregarPainel(); carregarMensagens() }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {erro && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">Não foi possível carregar o painel: {erro}</CardContent>
        </Card>
      )}
      {carregando && !painel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      {painel && (
        <>
          {!painel.n8nDisponivel && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 text-sm text-amber-800">
                Sem dados do n8n: {painel.erroN8n}. Os números de envio continuam valendo.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Numero rotulo="Enviadas hoje" valor={painel.hoje.enviado} />
            <Numero rotulo="Barradas hoje" valor={painel.hoje.barrado} destaque="atencao" />
            <Numero rotulo="Falhas hoje" valor={painel.hoje.falhou} destaque="ruim" />
            <Numero rotulo="Sem confirmação hoje" valor={painel.hoje.incerto} destaque="ruim" />
            <Numero rotulo="Alertas abertos" valor={painel.alertasAbertos} destaque="ruim" />
          </div>
          {categorias.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Enviadas hoje por categoria na Meta: {categorias.map(([c, n]) => `${n} ${c.toLowerCase()}`).join(' · ')}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Envios por dia</CardTitle>
              <CardDescription>Últimos 14 dias, horário de Brasília. Só conta o que o portão confirmou como enviado.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={diasComDado}>
                  <CartesianGrid {...adminChartGridProps} vertical={false} />
                  <XAxis dataKey="dia" stroke={adminChartAxisStroke} tick={adminChartAxisTick} fontSize={12} />
                  <YAxis allowDecimals={false} stroke={adminChartAxisStroke} tick={adminChartAxisTick} fontSize={12} />
                  <Tooltip {...adminChartTooltipProps} formatter={(v, k) => [v, nomes[String(k)] ?? k]} />
                  <Legend formatter={(k) => nomes[String(k)] ?? k} />
                  {Object.keys(CORES_FLUXO).map((f) => (
                    <Bar key={f} dataKey={f} stackId="envios" fill={CORES_FLUXO[f]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fluxos</CardTitle>
              <CardDescription>
                Desligar aqui segura o envio na hora, sem parar o workflow: tudo volta barrado e é tentado de novo depois.
                O teto conta enviadas, em andamento e sem confirmação do dia.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fluxo</TableHead>
                    <TableHead>Envio</TableHead>
                    <TableHead>Hoje</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Último envio</TableHead>
                    <TableHead>n8n</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {painel.fluxos.map((f) => (
                    <LinhaDoFluxo key={f.fluxo} f={f} aoSalvar={carregarPainel} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>
                Detectados pelo vigia a cada 15 minutos e mandados no Telegram. &quot;Aberto&quot; é o que ainda foi visto na última meia hora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {painel.alertas.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Nenhum alerta até agora.
                </p>
              ) : (
                <ul className="divide-y">
                  {painel.alertas.map((a) => {
                    const aberto = Date.now() - new Date(a.ultimaVezEm).getTime() <= 30 * 60 * 1000
                    return (
                      <li key={a.chave} className="flex gap-3 py-3">
                        <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.gravidade === 'critico' ? 'text-red-600' : 'text-amber-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {a.titulo}{' '}
                            {aberto ? (
                              <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700">aberto</Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-600">resolvido</Badge>
                            )}
                          </p>
                          {a.detalhe && <p className="break-words text-sm text-muted-foreground">{a.detalhe}</p>}
                          <p className="text-xs text-muted-foreground">
                            visto {a.vezes}x · primeira vez {quando(a.primeiraVezEm)} · última {quando(a.ultimaVezEm)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Envios</CardTitle>
          <CardDescription>Tudo o que passou pelo portão, do mais recente. Busque por telefone, chave ou template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="filtro-fluxo"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={filtroFluxo}
              onChange={(e) => { setFiltroFluxo(e.target.value); setPagina(0) }}
            >
              <option value="">Todos os fluxos</option>
              {(painel?.fluxos ?? []).map((f) => (
                <option key={f.fluxo} value={f.fluxo}>{f.nome}</option>
              ))}
            </select>
            <select
              id="filtro-status"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPagina(0) }}
            >
              <option value="">Todos os status</option>
              {['enviado', 'barrado', 'falhou', 'incerto', 'reservado'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); setBuscaAplicada(busca); setPagina(0) }}
            >
              <Input
                id="busca-envios"
                placeholder="Telefone, chave ou template"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9 w-64"
              />
              <Button type="submit" variant="outline" size="sm">
                <Search className="mr-1 h-4 w-4" /> Buscar
              </Button>
            </form>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">{totalMensagens} envio(s)</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Fluxo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mensagens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Nenhum envio encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  mensagens.map((m) => (
                    <Fragment key={m.id}>
                      <TableRow>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{quando(m.enviadoEm ?? m.tentativaEm)}</TableCell>
                        <TableCell className="text-sm">{nomes[m.fluxo] ?? m.fluxo}</TableCell>
                        <TableCell className="text-sm tabular-nums">{m.telefone}</TableCell>
                        <TableCell className="text-sm">
                          {m.template}
                          {m.categoria && <span className="block text-xs text-muted-foreground">{m.categoria.toLowerCase()}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={CORES_STATUS[m.status] ?? 'bg-gray-100 text-gray-600'}>
                            {m.status}
                          </Badge>
                          {m.tentativas > 1 && <span className="block text-xs text-muted-foreground">{m.tentativas} tentativas</span>}
                        </TableCell>
                        <TableCell className="max-w-[320px] text-xs text-muted-foreground">
                          <span className="break-words">{m.motivo ?? ''}</span>
                          {m.n8nWorkflowId && m.n8nExecucaoId && (
                            <a
                              href={`${N8N_URL}/workflow/${m.n8nWorkflowId}/executions/${m.n8nExecucaoId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 inline-flex items-center gap-0.5 hover:underline"
                            >
                              execução <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">
              {totalMensagens === 0 ? 0 : pagina + 1} / {Math.max(1, Math.ceil(totalMensagens / POR_PAGINA))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={(pagina + 1) * POR_PAGINA >= totalMensagens}
              onClick={() => setPagina((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
