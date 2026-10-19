'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Marca } from '../partes'
import styles from '../mapa.module.css'

/**
 * Resgate: pagamento do Mapa que nao achou o Mapa.
 *
 * Acontece quando o checkout nao devolveu o token nem um telefone que bata (a
 * Story 7.0 diz com que frequencia). A pessoa chega aqui pelo link do e-mail,
 * ja logada. Se este aparelho gerou um Mapa nos ultimos dias, ela escolhe qual
 * liberar; se nao, gera um novo — e na tela do Mapa pronto o botao de pagar
 * vira "Liberar com meu pagamento".
 */

type Dados = {
  mapas: { token: string; sintoma: string }[]
  creditos: number
  desteAparelho: { token: string; nome: string; sintoma: string; criadoEm: string }[]
}

export default function ResgatarPage() {
  const router = useRouter()
  const [dados, setDados] = useState<Dados | null>(null)
  const [liberando, setLiberando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const res = await fetch('/api/mapa/meus', { cache: 'no-store' }).catch(() => null)
    if (res?.status === 401) {
      router.replace(`/login?next=${encodeURIComponent('/mapa/resgatar')}`)
      return
    }
    if (res?.ok) setDados((await res.json()) as Dados)
  }, [router])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function liberar(token: string) {
    setLiberando(token)
    setErro(null)
    const res = await fetch(`/api/mapa/${token}/resgatar`, { method: 'POST' }).catch(() => null)
    if (res?.ok) {
      router.push(`/mapa/${token}`)
      return
    }
    const corpo = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setErro(corpo?.error ?? 'Não foi possível liberar agora.')
    setLiberando(null)
  }

  if (!dados) {
    return (
      <main className={styles.wrap}>
        <Marca />
        <Loader2 className="animate-spin" color="#6366f1" />
      </main>
    )
  }

  if (dados.creditos === 0) {
    return (
      <main className={styles.wrap}>
        <Marca />
        <h1 className={styles.h1}>Teus Mapas</h1>
        <p className={styles.sub}>
          Não há pagamento esperando um Mapa. Os que você já liberou estão na Biblioteca.
        </p>
        <Link href="/biblioteca" className={styles.btn}>
          VER NA BIBLIOTECA
        </Link>
      </main>
    )
  }

  return (
    <main className={styles.wrap}>
      <Marca />
      <h1 className={styles.h1}>Teu pagamento foi confirmado</h1>
      {dados.desteAparelho.length > 0 ? (
        <>
          <p className={styles.sub}>Qual Mapa você quer liberar?</p>
          <div className={styles.lista}>
            {dados.desteAparelho.map((m) => (
              <button
                key={m.token}
                type="button"
                className={styles.itemLista}
                onClick={() => void liberar(m.token)}
                disabled={liberando !== null}
                style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
              >
                <span>
                  <b>{m.sintoma}</b>
                  <small>Mapa de {m.nome}</small>
                </span>
                {liberando === m.token ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} color="#6366f1" />
                )}
              </button>
            ))}
          </div>
          {erro ? <p className={styles.erro}>{erro}</p> : null}
          <p className={styles.hint} style={{ marginTop: 18 }}>
            Não é nenhum desses? Gere de novo — ele sai já liberado.
          </p>
          <Link href="/mapa" className={styles.btn} style={{ marginTop: 6 }}>
            GERAR MEU MAPA
          </Link>
        </>
      ) : (
        <>
          <p className={styles.sub}>
            Responda as perguntas de novo — em menos de 1 minuto teu Mapa sai, já liberado com o
            pagamento que você fez.
          </p>
          <Link href="/mapa" className={styles.btn}>
            GERAR MEU MAPA
          </Link>
        </>
      )}
    </main>
  )
}
