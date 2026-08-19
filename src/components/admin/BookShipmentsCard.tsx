'use client'

/**
 * Fila do livro impresso.
 *
 * Componente proprio, e nao mais uma secao dentro de `/admin/entregas`: aquela
 * tela ja carrega duas listas com paginacao independente, e uma terceira no mesmo
 * estado faria as tres brigarem por `pagina` e `filtro`.
 *
 * A pergunta que a tela responde e "o livro saiu?". O recorte que importa e
 * `aguardando_postagem` com muitos dias — livro que a grafica nao postou e sobre
 * o qual ninguem reclamou ainda, porque o comprador nem sabe que devia ter saido.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Package,
  Search,
  Truck
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

type Shipment = {
  id: string
  email: string
  nome: string | null
  provider: string
  externalTransactionId: string
  status: string
  trackingCode: string | null
  carrierLabel: string | null
  trackingUrl: string | null
  lastStatusLabel: string | null
  postedAt: string | null
  deliveredAt: string | null
  createdAt: string
}

const POR_PAGINA = 25

const ROTULO: Record<string, string> = {
  aguardando_postagem: 'Aguardando postagem',
  postado: 'Postado',
  em_transito: 'Em trânsito',
  entregue: 'Entregue',
  devolvido: 'Devolvido',
  problema: 'Problema'
}

const CORES: Record<string, string> = {
  aguardando_postagem: 'bg-amber-100 text-amber-800',
  postado: 'bg-blue-100 text-blue-700',
  em_transito: 'bg-indigo-100 text-indigo-700',
  entregue: 'bg-emerald-100 text-emerald-700',
  devolvido: 'bg-orange-100 text-orange-800',
  problema: 'bg-red-100 text-red-700'
}

const FILTROS: Array<{ valor: string; rotulo: string }> = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'aguardando_postagem', rotulo: 'Aguardando' },
  { valor: 'em_transito', rotulo: 'A caminho' },
  { valor: 'entregue', rotulo: 'Entregues' },
  { valor: 'problema', rotulo: 'Problema' }
]

function quando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function BookShipmentsCard() {
  const [items, setItems] = useState<Shipment[]>([])
  const [totais, setTotais] = useState<Record<string, number>>({})
  const [parados, setParados] = useState(0)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const [filtro, setFiltro] = useState('')
  const [pagina, setPagina] = useState(0)
  // `busca` e o que o campo mostra; `buscaAtiva` e o que ja foi consultado.
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
      if (buscaAtiva) params.set('busca', buscaAtiva)

      const res = await fetch(`/api/admin/book-shipments?${params.toString()}`)
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items ?? [])
      setTotais(d.totals ?? {})
      setParados(d.paradosHaDias ?? 0)
      setTotal(d.total ?? 0)
    } finally {
      setCarregando(false)
    }
  }, [filtro, pagina, buscaAtiva])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const trocarFiltro = (valor: string) => {
    // Sem voltar para a primeira pagina, o offset antigo cai fora do recorte novo
    // e a lista aparece vazia sem motivo aparente.
    setFiltro(valor)
    setPagina(0)
  }

  const aplicarBusca = () => {
    setBuscaAtiva(busca.trim())
    setPagina(0)
  }

  const ultimaPagina = Math.max(0, Math.ceil(total / POR_PAGINA) - 1)
  const primeiro = total === 0 ? 0 : pagina * POR_PAGINA + 1
  const ultimo = Math.min((pagina + 1) * POR_PAGINA, total)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" /> Livros impressos
        </CardTitle>
        <CardDescription>
          O código de rastreio chega pelo n8n, que lê a planilha da gráfica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parados > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>{parados}</strong> livro(s) esperando postagem há mais de 15
            dias. A gráfica ainda não preencheu a planilha, e o comprador não tem
            como saber disso sozinho.
          </div>
        ) : null}

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
              placeholder="E-mail, nome ou código"
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
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              <Truck className="mx-auto mb-2 h-5 w-5" />
              {filtro || buscaAtiva
                ? 'Nenhum envio com esse recorte.'
                : 'Nenhum livro impresso registrado ainda.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const dias = diasDesde(s.createdAt)
                  const atrasado =
                    s.status === 'aguardando_postagem' && dias >= 15
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-xs text-gray-500">
                        {quando(s.createdAt)}
                        <div className={atrasado ? 'text-amber-700' : ''}>
                          há {dias} dia(s)
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{s.nome ?? '—'}</div>
                        <div className="text-xs text-gray-500">{s.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.trackingCode ? (
                          <div className="space-y-0.5">
                            {s.trackingUrl ? (
                              <a
                                href={s.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 hover:underline"
                              >
                                {s.trackingCode}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="font-mono text-xs">
                                {s.trackingCode}
                              </span>
                            )}
                            <div className="text-xs text-gray-500">
                              {s.carrierLabel}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            sem código
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="secondary"
                            className={
                              CORES[s.status] ?? 'bg-gray-100 text-gray-600'
                            }
                          >
                            {ROTULO[s.status] ?? s.status}
                          </Badge>
                          {s.lastStatusLabel ? (
                            <span className="max-w-xs truncate text-xs text-gray-500">
                              {s.lastStatusLabel}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs text-gray-500">
              {primeiro}–{ultimo} de {total}
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
  )
}
