'use client'

/**
 * Onde esta o livro impresso, para quem comprou.
 *
 * Existe porque o card da biblioteca so tinha espaco para uma frase e um codigo
 * solto. Quem recebe um codigo da Loggi no meio de uma tela de livros digitais
 * nao tem o que fazer com ele: nao da para clicar, e copiar a mao um numero de
 * 23 digitos e pedir para errar.
 *
 * Aqui o codigo vira botao, o historico vira linha do tempo, e quem ja recebeu
 * pode dizer isso — que e a unica forma de o status fechar quando a
 * transportadora nao avisa, o que e a regra e nao a excecao.
 *
 * Texto em pt-BR sem chave de traducao, igual ao card: o livro impresso so e
 * vendido no Brasil, e criar chave para idioma que nunca ve esta tela seria
 * inventar traducao para ninguem.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  PackageCheck,
  Truck
} from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { AppPageHeader } from '@/components/navigation/AppPageHeader'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  ShipmentTimeline,
  type Marco
} from '@/components/library/ShipmentTimeline'
import { apiFetch } from '@/lib/fetchClient'

type Shipment = {
  id: string
  status: string
  trackingCode: string | null
  carrierLabel: string | null
  trackingUrl: string | null
  lastStatusLabel: string | null
  postedAt: string | null
  deliveredAt: string | null
  deliveryConfirmedAt: string | null
  lastCheckedAt: string | null
  createdAt: string
}

const TITULO: Record<string, string> = {
  aguardando_postagem: 'Sendo preparado',
  postado: 'A caminho',
  em_transito: 'A caminho',
  entregue: 'Entregue',
  devolvido: 'Voltou para nós',
  problema: 'Entrega travada'
}

const CORES: Record<string, string> = {
  aguardando_postagem: 'bg-amber-100 text-amber-900',
  postado: 'bg-blue-100 text-blue-900',
  em_transito: 'bg-indigo-100 text-indigo-900',
  entregue: 'bg-emerald-100 text-emerald-900',
  devolvido: 'bg-orange-100 text-orange-900',
  problema: 'bg-red-100 text-red-900'
}

const CONFIRMAVEIS = new Set(['postado', 'em_transito'])

function montarMarcos(s: Shipment): Marco[] {
  const postou = Boolean(s.postedAt) || s.status !== 'aguardando_postagem'
  const chegou = Boolean(s.deliveredAt) || s.status === 'entregue'

  const marcos: Marco[] = [
    {
      chave: 'compra',
      titulo: 'Pedido registrado',
      detalhe: 'Seu livro entrou na fila da gráfica.',
      quando: s.createdAt,
      cumprido: true
    },
    {
      chave: 'postagem',
      titulo: postou ? 'Despachado pela gráfica' : 'Aguardando a gráfica postar',
      detalhe: postou
        ? s.carrierLabel
          ? `Saiu com a ${s.carrierLabel}.`
          : null
        : 'Assim que sair, o código de rastreio aparece aqui.',
      quando: s.postedAt,
      cumprido: postou
    }
  ]

  // A ultima noticia da transportadora so vira marco proprio quando ela existe e
  // ainda nao virou entrega — senao repetiria o passo de baixo.
  if (s.lastStatusLabel && !chegou) {
    marcos.push({
      chave: 'ultima-noticia',
      titulo: 'Última movimentação',
      detalhe: s.lastStatusLabel,
      quando: s.lastCheckedAt,
      cumprido: true
    })
  }

  marcos.push({
    chave: 'entrega',
    titulo: chegou ? 'Entregue' : 'A caminho de você',
    detalhe: s.deliveryConfirmedAt
      ? 'Você confirmou o recebimento.'
      : chegou
        ? 'A transportadora registrou a entrega.'
        : null,
    quando: s.deliveredAt,
    cumprido: chegou
  })

  return marcos
}

function CodigoDeRastreio({ shipment }: { shipment: Shipment }) {
  const [copiado, setCopiado] = useState(false)
  const codigo = shipment.trackingCode
  if (!codigo) return null

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Navegador sem permissao de area de transferencia. O codigo esta na tela
      // e da para selecionar na mao — nao vale interromper com um alerta.
    }
  }

  return (
    <div className="rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-900/50">
      <p className="text-xs text-zinc-500">
        Código de rastreio
        {shipment.carrierLabel ? ` · ${shipment.carrierLabel}` : ''}
      </p>
      <p className="mt-1 break-all font-mono text-sm font-medium">{codigo}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={copiar}
        >
          {copiado ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar código
            </>
          )}
        </Button>

        {shipment.trackingUrl ? (
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={() => {
              // Copia junto de proposito: a pagina da transportadora as vezes
              // pede o codigo de novo, e quem chegou la sem ele volta.
              void copiar()
              window.open(
                shipment.trackingUrl as string,
                '_blank',
                'noopener,noreferrer'
              )
            }}
          >
            Rastrear na {shipment.carrierLabel ?? 'transportadora'}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default function RastreioPage() {
  const router = useRouter()
  const { status: sessao } = useSession()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [carregando, setCarregando] = useState(true)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await apiFetch('/api/shipments/me', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setShipments(data.shipments ?? [])
    } catch {
      setErro('Não foi possível carregar agora. Tente de novo em instantes.')
    } finally {
      setCarregando(false)
    }
  }, [router])

  useEffect(() => {
    if (sessao === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (sessao === 'authenticated') void carregar()
  }, [sessao, carregar, router])

  const confirmar = async (id: string) => {
    setConfirmando(id)
    setErro(null)
    try {
      const res = await apiFetch('/api/shipments/me/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment_id: id })
      })
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}))
        setErro(corpo.error ?? 'Não foi possível confirmar agora.')
        return
      }
      await carregar()
    } catch {
      setErro('Não foi possível confirmar agora.')
    } finally {
      setConfirmando(null)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar history={[]} selectedThread={null} onSelectSession={() => {}} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-muted/30">
          <AppPageHeader backFallback="/biblioteca" />

          <main className="flex-1 px-3 py-4 sm:px-4 sm:py-6">
            <div className="mx-auto w-full max-w-3xl">
              <h1 className="text-xl font-semibold">Meu livro impresso</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Acompanhe a entrega e confirme quando receber.
              </p>

              {erro ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {erro}
                </p>
              ) : null}

              {carregando ? (
                <div className="mt-10 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : shipments.length === 0 ? (
                <div className="mt-8 rounded-lg border bg-white p-6 text-center dark:bg-zinc-900">
                  <Package className="mx-auto h-8 w-8 text-zinc-300" />
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    Você ainda não tem nenhum livro impresso a caminho.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {shipments.map((s) => {
                    const podeConfirmar =
                      CONFIRMAVEIS.has(s.status) && !s.deliveryConfirmedAt

                    return (
                      <section
                        key={s.id}
                        className="rounded-xl border bg-white p-4 dark:bg-zinc-900 sm:p-5"
                      >
                        <div className="flex items-center gap-2">
                          {s.status === 'entregue' ? (
                            <PackageCheck className="h-5 w-5 text-emerald-600" />
                          ) : s.status === 'em_transito' ||
                            s.status === 'postado' ? (
                            <Truck className="h-5 w-5 text-indigo-600" />
                          ) : (
                            <Package className="h-5 w-5 text-amber-600" />
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              CORES[s.status] ?? 'bg-zinc-100 text-zinc-900'
                            }`}
                          >
                            {TITULO[s.status] ?? 'Livro impresso'}
                          </span>
                        </div>

                        <div className="mt-4">
                          <CodigoDeRastreio shipment={s} />
                        </div>

                        <div className="mt-5">
                          <ShipmentTimeline marcos={montarMarcos(s)} />
                        </div>

                        {podeConfirmar ? (
                          <div className="mt-5 border-t pt-4">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              Já recebeu este livro?
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                              disabled={confirmando === s.id}
                              onClick={() => void confirmar(s.id)}
                            >
                              {confirmando === s.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Confirmar recebimento
                            </Button>
                            <p className="mt-2 text-xs text-zinc-500">
                              A confirmação é definitiva. Se precisar corrigir,
                              fale com o atendimento.
                            </p>
                          </div>
                        ) : null}

                        {s.status === 'problema' ||
                        s.status === 'devolvido' ? (
                          <p className="mt-4 border-t pt-4 text-sm text-zinc-600 dark:text-zinc-400">
                            Fale com o atendimento que a gente resolve o reenvio.
                          </p>
                        ) : null}
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
