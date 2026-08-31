'use client'

/**
 * Filas de compra e entrega.
 *
 * Existiam so como API: reprocessar uma venda exigia abrir o devtools e escrever
 * um fetch, o que na pratica deixava a operacao dependente de quem programa. As
 * duas filas respondem perguntas diferentes e por isso ficam lado a lado:
 *
 * - "vendas paradas" -> chegou dinheiro de um produto que ninguem cadastrou
 * - "avisos parados" -> o acesso foi liberado, mas o cliente nao soube
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send
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
import { BookShipmentsCard } from '@/components/admin/BookShipmentsCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

type PurchaseEvent = {
  id: string
  provider: string
  externalTransactionId: string
  externalProductId: string | null
  externalProductName: string | null
  email: string | null
  nome: string | null
  status: string
  reason: string | null
  createdAt: string
}

type PendingProduct = {
  provider: string
  external_product_id: string | null
  external_product_name: string | null
  vendas_paradas: number
}

type Delivery = {
  id: string
  email: string
  kind: string
  status: string
  attempts: number
  lastError: string | null
  sentAt: string | null
  createdAt: string
}

const CORES_STATUS: Record<string, string> = {
  processed: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-emerald-100 text-emerald-700',
  pending_mapping: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-700',
  // Nao e erro: o aviso nao saiu porque a pessoa ja tinha recebido o dela.
  skipped: 'bg-gray-100 text-gray-600',
  ignored: 'bg-gray-100 text-gray-600',
  received: 'bg-blue-100 text-blue-700'
}

const ROTULO_ENTREGA: Record<string, string> = {
  new_account: 'primeiro acesso',
  products_added: 'produto liberado',
  access_resent: 'reenvio'
}

function quando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function Etiqueta({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={CORES_STATUS[status] ?? 'bg-gray-100 text-gray-600'}
    >
      {status}
    </Badge>
  )
}

const POR_PAGINA = 25

const FILTROS: Array<{ valor: string; rotulo: string }> = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'pending', rotulo: 'Parados' },
  { valor: 'failed', rotulo: 'Falharam' },
  { valor: 'sent', rotulo: 'Entregues' },
  { valor: 'skipped', rotulo: 'Ja avisados' }
]

export default function EntregasPage() {
  const [vendas, setVendas] = useState<PurchaseEvent[]>([])
  const [porProduto, setPorProduto] = useState<PendingProduct[]>([])
  const [entregas, setEntregas] = useState<Delivery[]>([])
  const [totais, setTotais] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [filtro, setFiltro] = useState('')
  const [pagina, setPagina] = useState(0)
  // `busca` e o que o campo mostra; `buscaAtiva` e o que ja foi consultado. Separar
  // os dois evita disparar uma consulta por tecla digitada.
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({
        limit: String(POR_PAGINA),
        offset: String(pagina * POR_PAGINA)
      })
      if (filtro) params.set('status', filtro)
      if (buscaAtiva) params.set('email', buscaAtiva)

      const [rv, re] = await Promise.all([
        fetch('/api/admin/purchase-events?status=pending_mapping&limit=100'),
        fetch(`/api/admin/access-deliveries?${params.toString()}`)
      ])
      if (rv.ok) {
        const d = await rv.json()
        setVendas(d.items ?? [])
        setPorProduto(d.pending_by_product ?? [])
      }
      if (re.ok) {
        const d = await re.json()
        setEntregas(d.items ?? [])
        setTotais(d.totals ?? {})
        setTotal(d.total ?? 0)
      }
      if (!rv.ok || !re.ok) {
        setAviso('Não foi possível carregar tudo. Você é admin?')
      }
    } catch {
      setAviso('Falha ao consultar as filas.')
    } finally {
      setCarregando(false)
    }
  }, [filtro, pagina, buscaAtiva])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const trocarFiltro = (valor: string) => {
    // Sem voltar para a primeira pagina, trocar o filtro pode cair num offset que
    // nao existe no recorte novo e mostrar uma lista vazia sem motivo aparente.
    setFiltro(valor)
    setPagina(0)
  }

  const aplicarBusca = () => {
    setBuscaAtiva(busca.trim())
    setPagina(0)
  }

  const ultimaPagina = Math.max(0, Math.ceil(total / POR_PAGINA) - 1)
  const primeiroDaPagina = total === 0 ? 0 : pagina * POR_PAGINA + 1
  const ultimoDaPagina = Math.min((pagina + 1) * POR_PAGINA, total)

  const reprocessarVenda = async (id: string) => {
    setOcupado(id)
    setAviso(null)
    try {
      const res = await fetch(`/api/admin/purchase-events/${id}/reprocess`, {
        method: 'POST'
      })
      const d = await res.json().catch(() => ({}))
      setAviso(
        res.ok
          ? d.already_processed
            ? 'Essa venda já estava liberada.'
            : 'Venda liberada.'
          : // O 409 quer dizer que o produto continua sem cadastro — o botao nao
            // resolve isso, e dizer "erro" mandaria a pessoa procurar no lugar errado.
            d.reason ?? 'Não foi possível liberar. O produto já está cadastrado?'
      )
      await carregar()
    } finally {
      setOcupado(null)
    }
  }

  const reenviarAvisos = async () => {
    setOcupado('avisos')
    setAviso(null)
    try {
      const res = await fetch('/api/admin/access-deliveries?limit=50', {
        method: 'POST'
      })
      const d = await res.json().catch(() => ({}))
      setAviso(
        res.ok
          ? `Reenvio: ${d.entregues ?? 0} de ${d.tentadas ?? 0}.`
          : 'Não foi possível reenviar.'
      )
      await carregar()
    } finally {
      setOcupado(null)
    }
  }

  // Vem dos totais, e nao da lista: a lista agora e uma pagina, e contar nela
  // mostraria "3 parados" so porque os outros ficaram na pagina seguinte.
  const travadas = (totais.pending ?? 0) + (totais.failed ?? 0)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            Compras e entregas
          </h1>
          <p className="text-sm text-gray-500">
            Quem pagou e ainda não recebeu.
          </p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={carregando}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      {aviso ? (
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          {aviso}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Vendas paradas
            </CardDescription>
            <CardTitle className="text-3xl">{vendas.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500">
            Produto sem cadastro no catálogo
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Avisos parados
            </CardDescription>
            <CardTitle className="text-3xl">{travadas}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500">
            Acesso liberado, cliente sem saber
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Avisos entregues
            </CardDescription>
            <CardTitle className="text-3xl">{totais.sent ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500">Desde o início</CardContent>
        </Card>
      </div>

      {porProduto.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadastrar primeiro</CardTitle>
            <CardDescription>
              Quantas vendas cada produto não cadastrado está segurando.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {porProduto.map((p) => (
              <div
                key={`${p.provider}-${p.external_product_id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {p.external_product_name ?? 'Produto sem nome'}
                  </p>
                  <p className="truncate font-mono text-xs text-gray-500">
                    {p.provider} · {p.external_product_id ?? 'sem id'}
                  </p>
                </div>
                <Badge className="bg-amber-200 text-amber-900">
                  {p.vendas_paradas} venda(s)
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas sem produto cadastrado</CardTitle>
          <CardDescription>
            Cadastre o ID no catálogo e depois use Liberar.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {vendas.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              <Inbox className="mx-auto mb-2 h-5 w-5" />
              Nenhuma venda parada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto na origem</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap text-xs text-gray-500">
                      {quando(v.createdAt)}
                      <div className="uppercase">{v.provider}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{v.nome ?? '—'}</div>
                      <div className="text-xs text-gray-500">{v.email ?? '—'}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{v.externalProductName ?? '—'}</div>
                      <div className="font-mono text-xs text-gray-500">
                        {v.externalProductId ?? 'sem id'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => reprocessarVenda(v.id)}
                        disabled={ocupado === v.id}
                      >
                        {ocupado === v.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Liberar'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Avisos de acesso</CardTitle>
            <CardDescription>
              O reenvio usa o contato cadastrado, nunca um informado na hora.
            </CardDescription>
          </div>
          <Button
            onClick={reenviarAvisos}
            disabled={ocupado === 'avisos' || travadas === 0}
          >
            {ocupado === 'avisos' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Reenviar parados
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {FILTROS.map((f) => (
                <Button
                  key={f.valor || 'todos'}
                  size="sm"
                  variant={filtro === f.valor ? 'default' : 'outline'}
                  onClick={() => trocarFiltro(f.valor)}
                >
                  {f.rotulo}
                  {f.valor && totais[f.valor] ? (
                    <span className="ml-1.5 text-xs opacity-70">
                      {totais[f.valor]}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') aplicarBusca()
                }}
                placeholder="Buscar por e-mail"
                className="h-9 w-56"
              />
              <Button size="sm" variant="outline" onClick={aplicarBusca}>
                <Search className="h-4 w-4" />
              </Button>
              {buscaAtiva ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBusca('')
                    setBuscaAtiva('')
                    setPagina(0)
                  }}
                >
                  Limpar
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
          {entregas.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              {filtro || buscaAtiva
                ? 'Nenhum aviso com esse recorte.'
                : 'Nenhum aviso registrado.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs text-gray-500">
                      {quando(e.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">{e.email}</TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {ROTULO_ENTREGA[e.kind] ?? e.kind}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Etiqueta status={e.status} />
                          {e.attempts > 1 ? (
                            <span className="text-xs text-gray-500">
                              {e.attempts} tentativas
                            </span>
                          ) : null}
                        </div>
                        {e.lastError ? (
                          <span className="max-w-md truncate text-xs text-red-600">
                            {e.lastError}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </div>

          {total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <span className="text-xs text-gray-500">
                {primeiroDaPagina}–{ultimoDaPagina} de {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0 || carregando}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-500">
                  {pagina + 1} / {ultimaPagina + 1}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
                  disabled={pagina >= ultimaPagina || carregando}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <BookShipmentsCard />
    </div>
  )
}
