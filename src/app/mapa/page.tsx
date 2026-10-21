'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Marca, SelosConfianca } from './partes'
import styles from './mapa.module.css'

/**
 * Tela 1 do Mapa: o quiz de 5 passos (protótipo `1_gerar.html`).
 *
 * Chega pelo link da Aline: `?s=` traz o sintoma que ela extraiu da conversa
 * e `?id=` o telefone. Sem login, sem menu. So nome e sintoma travam o avanco;
 * o resto e opcional para nao perder ninguem no meio — mas e o resto que faz o
 * Mapa acertar o que a pessoa nao disse.
 *
 * Gerar cria o Mapa e leva para /mapa/<token>, que mostra a geracao e depois o
 * Mapa bloqueado. Assim o estado sobrevive a recarregar a pagina.
 */

// Progresso "psicologico" do protótipo: comeca alto e anda rapido.
const PCT = [0, 34, 58, 76, 90, 97]
const ROTULO = [
  'Vamos começar',
  'Boa. Mais 4 e pronto',
  'Quase na metade',
  'Falta pouco',
  'Última pergunta',
  'Só falta gerar'
]
const TOTAL = 5
const UTM_CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

type Momento = { momento: string; idade: string }

function QuizMapa() {
  const router = useRouter()
  const params = useSearchParams()

  const [passo, setPasso] = useState(1)
  const [nome, setNome] = useState('')
  const [sintoma, setSintoma] = useState(() => params.get('s')?.slice(0, 500) ?? '')
  const [tempo, setTempo] = useState('')
  const [momentos, setMomentos] = useState<Momento[]>([
    { momento: '', idade: '' },
    { momento: '', idade: '' },
    { momento: '', idade: '' }
  ])
  const [familia, setFamilia] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const campoRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  // Atraso da primeira pergunta so na chegada; voltar ao passo 1 nao espera.
  const [primeiraEntrada, setPrimeiraEntrada] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => campoRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [passo])

  function valido(): boolean {
    if (passo === 1) return nome.trim().length > 1
    if (passo === 2) return sintoma.trim().length > 3
    return true
  }

  function avancar() {
    if (!valido()) {
      campoRef.current?.focus()
      return
    }
    setPrimeiraEntrada(false)
    if (passo < TOTAL) setPasso(passo + 1)
  }

  async function gerar() {
    if (enviando) return
    setErro(null)
    setEnviando(true)

    const utm: Record<string, string> = {}
    for (const chave of UTM_CHAVES) {
      const valor = params.get(chave)
      if (valor) utm[chave] = valor.slice(0, 200)
    }

    try {
      const resposta = await fetch('/api/mapa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          sintoma,
          tempo,
          momentos,
          familia,
          telefone: params.get('id'),
          utm: Object.keys(utm).length ? utm : null
        })
      })
      const dados = (await resposta.json().catch(() => ({}))) as {
        token?: string
        error?: string
      }
      if (!resposta.ok || !dados.token) {
        setErro(dados.error ?? 'Não foi possível gerar agora. Tente de novo.')
        setEnviando(false)
        return
      }
      router.push(`/mapa/${dados.token}`)
    } catch {
      setErro('Sem conexão. Confira a internet e tente de novo.')
      setEnviando(false)
    }
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (passo < TOTAL) avancar()
    else void gerar()
  }

  const pct = enviando ? 100 : PCT[passo - 1]

  return (
    <main className={`${styles.wrap} ${styles.entrada}`}>
      <Marca />
      <h1 className={styles.h1}>Mapa da Origem Emocional</h1>
      <p className={styles.sub}>
        O mapa completo e personalizado que terapeutas usam nos atendimentos.
      </p>
      <div className={styles.prog}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.plabel}>
        <span>{ROTULO[passo - 1]}</span>
        <b>{pct}%</b>
      </div>

      {passo === 1 && (
        <div
          className={styles.step}
          key="p1"
          // So a primeira pergunta espera o cabecalho terminar de entrar.
          style={primeiraEntrada ? { animationDelay: '300ms' } : undefined}
        >
          <label htmlFor="nome" className={styles.label}>
            Como você se chama?
          </label>
          <p className={styles.hint}>Só o primeiro nome já basta.</p>
          <input
            id="nome"
            ref={(el) => {
              campoRef.current = el
            }}
            className={styles.input}
            type="text"
            placeholder="Seu nome"
            autoComplete="given-name"
            maxLength={80}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={aoTeclar}
          />
          <button className={styles.btn} onClick={avancar} disabled={!valido()}>
            CONTINUAR
          </button>
        </div>
      )}

      {passo === 2 && (
        <div className={styles.step} key="p2">
          <label htmlFor="sintoma" className={styles.label}>
            Sobre o que você quer pesquisar?
          </label>
          <p className={styles.hint}>
            Um sintoma, uma dor, algo que não passa. Descreve do teu jeito.
          </p>
          <textarea
            id="sintoma"
            ref={(el) => {
              campoRef.current = el
            }}
            className={styles.textarea}
            placeholder="Ex.: dor na lombar que piora à noite"
            maxLength={500}
            value={sintoma}
            onChange={(e) => setSintoma(e.target.value)}
          />
          <button className={styles.btn} onClick={avancar} disabled={!valido()}>
            CONTINUAR
          </button>
          <button className={styles.back} onClick={() => setPasso(1)}>
            voltar
          </button>
        </div>
      )}

      {passo === 3 && (
        <div className={styles.step} key="p3">
          <label htmlFor="tempo" className={styles.label}>
            Há quanto tempo você sente isso?
          </label>
          <p className={styles.hint}>Aproximado está ótimo.</p>
          <input
            id="tempo"
            ref={(el) => {
              campoRef.current = el
            }}
            className={styles.input}
            type="text"
            placeholder="Ex.: uns 3 meses · desde os 20 anos"
            maxLength={120}
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            onKeyDown={aoTeclar}
          />
          <button className={styles.btn} onClick={avancar}>
            CONTINUAR
          </button>
          <button className={styles.back} onClick={() => setPasso(2)}>
            voltar
          </button>
        </div>
      )}

      {passo === 4 && (
        <div className={styles.step} key="p4">
          <label className={styles.label}>Três momentos que marcaram a tua vida.</label>
          <p className={styles.hint}>
            O corpo guarda datas. Do jeito que vierem — e mais ou menos a idade que você tinha.
          </p>
          {momentos.map((m, i) => (
            <div key={i} className={styles.row}>
              <input
                ref={
                  i === 0
                    ? (el) => {
                        campoRef.current = el
                      }
                    : undefined
                }
                className={styles.input}
                type="text"
                placeholder={`Momento ${i + 1}`}
                maxLength={200}
                value={m.momento}
                onChange={(e) =>
                  setMomentos((atual) =>
                    atual.map((x, j) => (j === i ? { ...x, momento: e.target.value } : x))
                  )
                }
                onKeyDown={aoTeclar}
              />
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="idade"
                maxLength={20}
                value={m.idade}
                onChange={(e) =>
                  setMomentos((atual) =>
                    atual.map((x, j) => (j === i ? { ...x, idade: e.target.value } : x))
                  )
                }
                onKeyDown={aoTeclar}
              />
            </div>
          ))}
          <button className={styles.btn} onClick={avancar}>
            CONTINUAR
          </button>
          <button className={styles.back} onClick={() => setPasso(3)}>
            voltar
          </button>
        </div>
      )}

      {passo === 5 && (
        <div className={styles.step} key="p5">
          <label htmlFor="familia" className={styles.label}>
            Descreve um acontecimento importante relacionado à tua mãe ou ao teu pai.
          </label>
          <p className={styles.hint}>Pode ser curto. O que vier primeiro.</p>
          <textarea
            id="familia"
            ref={(el) => {
              campoRef.current = el
            }}
            className={styles.textarea}
            placeholder="Ex.: meu pai faleceu quando eu tinha 10 anos"
            maxLength={500}
            value={familia}
            onChange={(e) => setFamilia(e.target.value)}
          />
          <button className={styles.btn} onClick={() => void gerar()} disabled={enviando}>
            {enviando ? <Loader2 size={20} className="animate-spin" /> : null}
            GERAR MEU MAPA
          </button>
          {erro ? <p className={styles.erro}>{erro}</p> : null}
          <button className={styles.back} onClick={() => setPasso(4)} disabled={enviando}>
            voltar
          </button>
          <p className={`${styles.hint} ${styles.hintCentro}`}>Pronto em menos de 1 minuto.</p>
        </div>
      )}

      <SelosConfianca />
    </main>
  )
}

export default function MapaPage() {
  return (
    <Suspense fallback={null}>
      <QuizMapa />
    </Suspense>
  )
}
