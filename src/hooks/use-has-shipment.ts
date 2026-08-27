'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/fetchClient'

const CHAVE = 'has-book-shipment-v1'
const VALIDADE = 10 * 60 * 1000

/**
 * Se esta pessoa tem algum livro impresso registrado.
 *
 * Serve para o item "Meu livro impresso" so existir no menu de quem comprou. A
 * grande maioria nunca comprou o impresso, e um menu que leva a uma tela vazia
 * ensina a ignorar o menu.
 *
 * Responde `false` enquanto carrega, de proposito: e melhor o item aparecer um
 * instante depois do que piscar na tela de quem nao deveria ve-lo. O cache local
 * evita esse instante em toda navegacao seguinte.
 */
export function useHasShipment(): boolean {
  const [tem, setTem] = useState(false)

  useEffect(() => {
    let vivo = true

    try {
      const bruto = localStorage.getItem(CHAVE)
      if (bruto) {
        const { valor, quando } = JSON.parse(bruto) as {
          valor: boolean
          quando: number
        }
        if (Date.now() - quando < VALIDADE) {
          setTem(valor)
          if (valor) return
          // `false` em cache ainda revalida: quem acabou de comprar precisa ver
          // o item aparecer sem esperar o cache vencer.
        }
      }
    } catch {
      // Sem armazenamento local (aba anonima, site data bloqueado). Consulta
      // direto — custa uma requisicao, nao quebra nada.
    }

    void (async () => {
      try {
        const res = await apiFetch('/api/shipments/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const valor = (data.shipments?.length ?? 0) > 0
        if (!vivo) return
        setTem(valor)
        try {
          localStorage.setItem(
            CHAVE,
            JSON.stringify({ valor, quando: Date.now() })
          )
        } catch {
          // idem
        }
      } catch {
        // Silencio: isto so decide se um item de menu aparece.
      }
    })()

    return () => {
      vivo = false
    }
  }, [])

  return tem
}
