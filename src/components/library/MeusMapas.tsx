'use client'

/**
 * Meus Mapas — os Mapas da Origem Emocional pagos, na Biblioteca.
 *
 * E a promessa da venda ("fica guardado pra sempre na tua Biblioteca"): se a
 * pessoa perder o e-mail ou o link, o Mapa esta aqui. Quem tem pagamento sem
 * Mapa vinculado (credito) ve o atalho para resgatar.
 *
 * Nao renderiza nada para quem nunca comprou um Mapa. Texto em pt-BR sem chave
 * de traducao, como o `BookShipmentStatus`: o Mapa so e vendido no Brasil.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Map } from 'lucide-react'
import { apiFetch } from '@/lib/fetchClient'

type MapaResumo = {
  token: string
  nome: string
  sintoma: string
  pagoEm: string | null
}

function data(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function MeusMapas() {
  const [mapas, setMapas] = useState<MapaResumo[]>([])
  const [creditos, setCreditos] = useState(0)

  useEffect(() => {
    let ativo = true
    void (async () => {
      try {
        const res = await apiFetch('/api/mapa/meus', { cache: 'no-store' })
        if (!res.ok) return
        const dados = await res.json()
        if (!ativo) return
        setMapas(dados.mapas ?? [])
        setCreditos(dados.creditos ?? 0)
      } catch {
        // A lista de Mapas nunca pode atrapalhar o resto da biblioteca.
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  if (mapas.length === 0 && creditos === 0) return null

  return (
    <div id="mapas" className="mx-auto mb-5 w-full max-w-3xl">
      <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <Map className="h-4 w-4" />
          Meus Mapas da Origem Emocional
        </div>

        {creditos > 0 ? (
          <Link
            href="/mapa/resgatar"
            className="mb-2 flex items-center justify-between rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800"
          >
            {creditos === 1
              ? 'Você tem 1 Mapa pago para liberar'
              : `Você tem ${creditos} Mapas pagos para liberar`}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}

        <ul className="divide-y divide-indigo-50">
          {mapas.map((m) => (
            <li key={m.token}>
              <Link
                href={`/mapa/${m.token}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{m.sintoma}</span>
                  <span className="block text-xs text-gray-500">
                    Mapa de {m.nome} · {data(m.pagoEm)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-indigo-600" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
