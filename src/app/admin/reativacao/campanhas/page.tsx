'use client'

/**
 * Acompanhamento das ondas.
 *
 * O controle mais importante desta tela e o botao de parar. O plano diz que se a
 * taxa de bloqueio subir, para tudo — e isso precisa ser um clique de quem esta
 * olhando o numero, nao um chamado para quem programa.
 *
 * O funil e o de sempre: enviado -> clicou -> acessou. Sem separar clique de
 * acesso, quem travou na porta e indistinguivel de quem nem abriu, e as duas
 * coisas pedem correcoes opostas na proxima onda.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Loader2,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ROTULO_ESTADO, type Estado } from '@/lib/reativacao/tipos'

type Metricas = {
  total: number
  pendente: number
  enviando: number
  enviado: number
  falhou: number
  descartado: number
  semTelefone: number
  telefoneInvalido: number
  clicou: number
  acessou: number
  acessouPorRastro: number
}

type Campanha = {
  id: string
  nome: string
  status: string
  templateName: string
  templateLang: string
  corteDias: number
  tetoDiario: number
  horaInicio: number
  horaFim: number
  totalDestinatarios: number
  criadoPor: string
  criadoEm: string
  iniciadaEm: string | null
  metricas: Metricas
}

type Destinatario = {
  id: string
  email: string
  nome: string | null
  telefone: string | null
  estado: string
  origens: string[]
  status: string
  motivo: string | null
  enviadoEm: string | null
  clicouEm: string | null
  acessouEm: string | null
  tentativas: number
  ultimoErro: string | null
}

type Detalhe = {
  campanha: Campanha & { concluidaEm: string | null }
  metricas: Metricas
  enviadosHoje: number
  destinatarios: Destinatario[]
}

const CORES_STATUS: Record<string, string> = {
  rascunho: 'border-slate-300 bg-slate-50 text-slate-700',
  ativa: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  pausada: 'border-amber-300 bg-amber-50 text-amber-800',
  concluida: 'border-sky-300 bg-sky-50 text-sky-800',
  cancelada: 'border-rose-300 bg-rose-50 text-rose-800'
}

const ROTULO_STATUS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
}

const CORES_ENVIO: Record<string, string> = {
  pendente: 'text-muted-foreground',
  enviando: 'text-amber-700',
  enviado: 'text-emerald-700',
  falhou: 'text-destructive',
  descartado: 'text-muted-foreground line-through'
}

function pct(parte: number, todo: number): string {
  if (!todo) return '—'
  return `${Math.round((parte / todo) * 100)}%`
}

function data(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<'ativa' | 'cancelada' | null>(null)
  const [agindo, setAgindo] = useState(false)

  const carregarLista = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/reativacao/campanhas')
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Falha ao carregar as ondas.')
        return
      }
      setCampanhas(json.campanhas)
      setErro(null)
      setSelecionadaId((atual) => {
        if (atual) return atual
        const naUrl = new URLSearchParams(window.location.search).get('nova')
        return naUrl || json.campanhas[0]?.id || null
      })
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setCarregando(false)
    }
  }, [])

  const carregarDetalhe = useCallback(async (id: string) => {
    setCarregandoDetalhe(true)
    try {
      const res = await fetch(`/api/admin/reativacao/campanhas/${id}`)
      const json = await res.json()
      setDetalhe(res.ok ? json : null)
    } catch {
      setDetalhe(null)
    } finally {
      setCarregandoDetalhe(false)
    }
  }, [])

  useEffect(() => {
    carregarLista()
  }, [carregarLista])

  useEffect(() => {
    if (selecionadaId) carregarDetalhe(selecionadaId)
  }, [selecionadaId, carregarDetalhe])

  const mudarStatus = async (novo: string) => {
    if (!selecionadaId) return
    setAgindo(true)
    try {
      const res = await fetch(`/api/admin/reativacao/campanhas/${selecionadaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo })
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Não foi possível mudar o status.')
      } else {
        setErro(null)
        await Promise.all([carregarLista(), carregarDetalhe(selecionadaId)])
      }
    } finally {
      setAgindo(false)
      setConfirmando(null)
    }
  }

  const c = detalhe?.campanha
  const m = detalhe?.metricas

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin/reativacao"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Público da reativação
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Ondas</h1>
        </div>
        <Button variant="outline" size="sm" onClick={carregarLista} disabled={carregando}>
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </header>

      {erro && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-1.5 lg:sticky lg:top-4 lg:self-start">
          {carregando && <Skeleton className="h-20 w-full" />}
          {!carregando && campanhas.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhuma onda ainda. Monte um recorte no público e crie a primeira.
            </p>
          )}
          {campanhas.map((camp) => {
            const ativa = camp.id === selecionadaId
            const enviado = camp.metricas.enviado
            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => setSelecionadaId(camp.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  ativa ? 'border-foreground bg-muted' : 'hover:border-foreground/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {camp.nome}
                  </span>
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${CORES_STATUS[camp.status] ?? ''}`}
                  >
                    {ROTULO_STATUS[camp.status] ?? camp.status}
                  </span>
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {enviado.toLocaleString('pt-BR')} de{' '}
                  {camp.totalDestinatarios.toLocaleString('pt-BR')} enviados
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-foreground/60"
                    style={{
                      width: `${camp.totalDestinatarios ? (enviado / camp.totalDestinatarios) * 100 : 0}%`
                    }}
                  />
                </div>
              </button>
            )
          })}
        </aside>

        <div className="min-w-0 space-y-4">
          {carregandoDetalhe && !detalhe && <Skeleton className="h-64 w-full" />}

          {c && m && (
            <>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{c.nome}</h2>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${CORES_STATUS[c.status] ?? ''}`}
                      >
                        {ROTULO_STATUS[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      template <code className="font-medium">{c.templateName}</code> ·{' '}
                      {c.templateLang} · teto {c.tetoDiario}/dia · {c.horaInicio}h às{' '}
                      {c.horaFim}h · criada por {c.criadoPor} em {data(c.criadoEm)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {c.status === 'rascunho' && (
                      <Button size="sm" onClick={() => setConfirmando('ativa')}>
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Ativar
                      </Button>
                    )}
                    {c.status === 'ativa' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={agindo}
                        onClick={() => mudarStatus('pausada')}
                      >
                        <Pause className="mr-1.5 h-3.5 w-3.5" />
                        Pausar
                      </Button>
                    )}
                    {c.status === 'pausada' && (
                      <Button
                        size="sm"
                        disabled={agindo}
                        onClick={() => mudarStatus('ativa')}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Retomar
                      </Button>
                    )}
                    {['rascunho', 'ativa', 'pausada'].includes(c.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmando('cancelada')}
                      >
                        <Ban className="mr-1.5 h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Metrica rotulo="Na lista" valor={m.total} />
                  <Metrica
                    rotulo="Enviado"
                    valor={m.enviado}
                    nota={pct(m.enviado, m.total - m.descartado)}
                  />
                  <Metrica
                    rotulo="Clicou"
                    valor={m.clicou}
                    nota={pct(m.clicou, m.enviado)}
                    destaque
                  />
                  <Metrica
                    rotulo="Acessou"
                    valor={m.acessou}
                    nota={pct(m.acessou, m.enviado)}
                    destaque
                  />
                  <Metrica rotulo="Falhou" valor={m.falhou} alerta={m.falhou > 0} />
                  <Metrica
                    rotulo="Descartado"
                    valor={m.descartado}
                    nota={
                      // O resto do descartado (ex.: onda cancelada) nao tem
                      // contador proprio — a nota so cobre o que se sabe.
                      [
                        m.semTelefone > 0 ? `${m.semTelefone} sem telefone` : null,
                        m.telefoneInvalido > 0 ? `${m.telefoneInvalido} inválido` : null
                      ]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Hoje saíram{' '}
                    <strong className="tabular-nums text-foreground">
                      {detalhe.enviadosHoje}
                    </strong>{' '}
                    de {c.tetoDiario}
                  </span>
                  <span>
                    Faltam{' '}
                    <strong className="tabular-nums text-foreground">
                      {m.pendente + m.enviando}
                    </strong>
                  </span>
                  {m.acessouPorRastro > 0 && (
                    <span>
                      Mais{' '}
                      <strong className="tabular-nums text-foreground">
                        {m.acessouPorRastro}
                      </strong>{' '}
                      com rastro de uso depois do envio, sem clique atribuído
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="border-b px-4 py-2.5 text-sm font-medium">
                  Destinatários
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    100 primeiros
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-xs">Pessoa</TableHead>
                      <TableHead className="h-9 w-32 text-xs">Estado</TableHead>
                      <TableHead className="h-9 w-28 text-xs">Envio</TableHead>
                      <TableHead className="h-9 w-24 text-xs">Clicou</TableHead>
                      <TableHead className="h-9 w-24 text-xs">Acessou</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalhe.destinatarios.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Nada aqui ainda.
                        </TableCell>
                      </TableRow>
                    )}
                    {detalhe.destinatarios.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="py-2">
                          <div className="truncate text-sm">{d.nome || '(sem nome)'}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {d.email}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {ROTULO_ESTADO[d.estado as Estado] ?? d.estado}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className={`text-xs ${CORES_ENVIO[d.status] ?? ''}`}>
                            {d.status}
                          </div>
                          {d.motivo && (
                            <div className="text-[11px] text-muted-foreground">
                              {d.motivo}
                            </div>
                          )}
                          {d.ultimoErro && (
                            <div
                              className="truncate text-[11px] text-destructive"
                              title={d.ultimoErro}
                            >
                              {d.ultimoErro}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-xs tabular-nums">
                          {data(d.clicouEm)}
                        </TableCell>
                        <TableCell className="py-2 text-xs tabular-nums">
                          {data(d.acessouEm)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={confirmando !== null} onOpenChange={(v) => !v && setConfirmando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmando === 'ativa' ? 'Ativar a onda?' : 'Cancelar a onda?'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm">
                {confirmando === 'ativa' && c && m ? (
                  <>
                    <p>
                      A partir daqui o n8n começa a entregar. Vão sair mensagens para{' '}
                      <strong>
                        {(m.total - m.descartado).toLocaleString('pt-BR')} pessoas
                      </strong>
                      , no máximo <strong>{c.tetoDiario} por dia</strong>, entre{' '}
                      {c.horaInicio}h e {c.horaFim}h.
                    </p>
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Mensagem enviada não volta atrás. Dá para pausar a qualquer
                        momento — o que já saiu, já saiu.
                      </span>
                    </div>
                  </>
                ) : (
                  <p>
                    Quem ainda não recebeu sai da fila e é marcado como descartado.
                    Onda cancelada não volta: ressuscitar a lista sem revisar é o
                    caminho para disparar duas vezes para a mesma pessoa.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmando(null)} disabled={agindo}>
              Voltar
            </Button>
            <Button
              variant={confirmando === 'cancelada' ? 'destructive' : 'default'}
              disabled={agindo}
              onClick={() => mudarStatus(confirmando!)}
            >
              {agindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmando === 'ativa' ? 'Ativar e começar a enviar' : 'Cancelar a onda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metrica({
  rotulo,
  valor,
  nota,
  destaque,
  alerta
}: {
  rotulo: string
  valor: number
  nota?: string
  destaque?: boolean
  alerta?: boolean
}) {
  return (
    <div
      className={`rounded-md border p-2.5 ${destaque ? 'border-foreground/20 bg-muted/40' : ''}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={`text-xl font-semibold tabular-nums ${alerta ? 'text-destructive' : ''}`}
      >
        {valor.toLocaleString('pt-BR')}
      </p>
      {nota && <p className="text-[11px] text-muted-foreground">{nota}</p>}
    </div>
  )
}
