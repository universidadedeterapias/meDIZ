'use client'

/**
 * Andamento do livro impresso, para quem comprou.
 *
 * Aparece na biblioteca porque e la que o comprador cai depois da compra, e e
 * onde ele repara que recebeu o digital e nao o impresso. Sem isto, a unica
 * resposta possivel para "e o meu livro?" e abrir o WhatsApp.
 *
 * Nao renderiza nada quando nao ha despacho — que e o caso da grande maioria,
 * porque so a compra do impresso gera um.
 *
 * O texto fica em pt-BR sem chave de traducao de proposito: o livro impresso so
 * e vendido no Brasil, e criar chaves para idiomas que nunca veem esta tela seria
 * inventar traducao para ninguem.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Package, Truck } from 'lucide-react'
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
  createdAt: string
}

const TITULO: Record<string, string> = {
  aguardando_postagem: 'Seu livro impresso está sendo preparado',
  postado: 'Seu livro impresso foi postado',
  em_transito: 'Seu livro impresso está a caminho',
  entregue: 'Seu livro impresso foi entregue',
  devolvido: 'Seu livro impresso voltou para nós',
  problema: 'Houve um problema com a entrega'
}

const EXPLICACAO: Record<string, string> = {
  aguardando_postagem:
    'Assim que a gráfica despachar, o código de rastreio aparece aqui.',
  postado: 'Já saiu da gráfica. O rastreio costuma levar um dia para atualizar.',
  em_transito: 'A transportadora está com ele.',
  entregue: 'Boa leitura.',
  devolvido:
    'A entrega não foi concluída e o livro retornou. Fale com o atendimento para reenviarmos.',
  problema:
    'A entrega travou no caminho. Fale com o atendimento que a gente resolve.'
}

const CORES: Record<string, string> = {
  aguardando_postagem: 'border-amber-200 bg-amber-50 text-amber-900',
  postado: 'border-blue-200 bg-blue-50 text-blue-900',
  em_transito: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  entregue: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  devolvido: 'border-orange-200 bg-orange-50 text-orange-900',
  problema: 'border-red-200 bg-red-50 text-red-900'
}

export function BookShipmentStatus() {
  const [shipments, setShipments] = useState<Shipment[]>([])

  useEffect(() => {
    let ativo = true
    void (async () => {
      try {
        const res = await apiFetch('/api/shipments/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (ativo) setShipments(data.shipments ?? [])
      } catch {
        // Silencio de proposito: isto e um complemento da biblioteca. Falhar aqui
        // nao pode roubar a atencao de quem so queria abrir o que comprou.
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  if (shipments.length === 0) return null

  return (
    <div className="mx-auto mb-5 w-full max-w-3xl space-y-3">
      {shipments.map((s) => (
        <div
          key={s.id}
          className={`rounded-lg border px-4 py-3 ${
            CORES[s.status] ?? 'border-gray-200 bg-gray-50 text-gray-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {s.status === 'em_transito' || s.status === 'postado' ? (
              <Truck className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <Package className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {TITULO[s.status] ?? 'Livro impresso'}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {s.lastStatusLabel ?? EXPLICACAO[s.status] ?? ''}
              </p>

              {/* O codigo em si mora em /rastreio, onde ele e botao de copiar e
                  de abrir a transportadora. Aqui, no meio de uma tela de livros
                  digitais, ele so ocupava espaco sem dar o que fazer. */}
              <Link
                href="/rastreio"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
              >
                {s.trackingCode
                  ? 'Ver rastreio e confirmar recebimento'
                  : 'Acompanhar a entrega'}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
