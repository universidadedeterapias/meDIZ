'use client'

/**
 * Linha do tempo de um despacho.
 *
 * Os marcos saem dos campos que o app controla — compra, postagem, entrega,
 * confirmacao — e nao do `events` cru da transportadora. Hoje o job do n8n manda
 * so o codigo de rastreio, entao `events` chega vazio; quando ele passar a
 * consultar a transportadora, os eventos entram aqui no meio, entre a postagem e
 * a entrega, sem mudar o resto.
 *
 * O passo futuro aparece apagado em vez de sumir. Ver "entregue" ainda por vir e
 * o que responde "e o meu livro?" sem precisar perguntar a ninguem.
 */

import { Check, Circle } from 'lucide-react'

export type Marco = {
  chave: string
  titulo: string
  detalhe?: string | null
  quando?: string | null
  cumprido: boolean
}

function dataCurta(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ShipmentTimeline({ marcos }: { marcos: Marco[] }) {
  return (
    <ol className="relative space-y-0">
      {marcos.map((m, i) => {
        const ultimo = i === marcos.length - 1
        return (
          <li key={m.chave} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  m.cumprido
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-zinc-300 bg-white text-zinc-300 dark:border-zinc-600 dark:bg-zinc-800'
                }`}
              >
                {m.cumprido ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-2 w-2 fill-current" />
                )}
              </span>
              {!ultimo ? (
                <span
                  className={`w-0.5 flex-1 ${
                    m.cumprido
                      ? 'bg-emerald-500/40'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ) : null}
            </div>

            <div className={`min-w-0 flex-1 ${ultimo ? 'pb-0' : 'pb-5'}`}>
              <p
                className={`text-sm font-medium ${
                  m.cumprido
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {m.titulo}
              </p>
              {m.detalhe ? (
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {m.detalhe}
                </p>
              ) : null}
              {dataCurta(m.quando) ? (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                  {dataCurta(m.quando)}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
