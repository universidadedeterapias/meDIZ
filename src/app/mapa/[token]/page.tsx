'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Download, Library, Lock, Zap } from 'lucide-react'
import { MapaDocumento } from '@/components/mapa/MapaDocumento'
import type { ConteudoMapa } from '@/lib/mapa/conteudo'
import type { VisaoMapa } from '@/lib/mapa/leitura'
import { CapaMapa, Marca } from '../partes'
import styles from '../mapa.module.css'

/**
 * O Mapa, do nascimento a leitura — uma URL so, que sobrevive a recarregar:
 *
 * - gerando: a animacao de 4 etapas do protótipo, acompanhando o status real;
 * - pronto e nao pago: tela 2 (capa visivel, corpo borrado, BAIXAR MEU MAPA);
 * - aguardando pagamento: o checkout abre em outra aba e esta pagina fica
 *   perguntando; quando o Pix cai, ela vira o Mapa sozinha;
 * - pago: tela 3, bloco de entrega + o Mapa inteiro aberto.
 *
 * E tambem o destino do link do e-mail e do WhatsApp (via /acesso).
 */

const ETAPAS = [
  'Lendo o que você descreveu',
  'Cruzando com o livro O Corpo Diz',
  'Identificando a origem emocional',
  'Montando o seu Mapa personalizado'
]
// Quando cada etapa acende, em segundos desde o inicio, e o % de cada uma.
const AGENDA = [
  { aPartirDe: 0, pct: 22 },
  { aPartirDe: 6, pct: 48 },
  { aPartirDe: 16, pct: 74 },
  { aPartirDe: 28, pct: 96 }
]
const MENSAGENS_PAGAMENTO = [
  'Abrindo o pagamento seguro',
  'Pix ou cartão',
  'ACESSO IMEDIATO após confirmar'
]
const INTERVALO_GERANDO_MS = 2000
const INTERVALO_PAGAMENTO_MS = 4000
const ESPERA_PAGAMENTO_MAX_MS = 30 * 60 * 1000

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'falha' }
  | { tipo: 'ok'; visao: VisaoMapa }

export default function MapaTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false)
  const inicioPagamento = useRef<number | null>(null)

  const buscar = useCallback(async (): Promise<VisaoMapa | null> => {
    try {
      const resposta = await fetch(`/api/mapa/${token}`, { cache: 'no-store' })
      if (resposta.status === 404) {
        setEstado({ tipo: 'nao_encontrado' })
        return null
      }
      if (!resposta.ok) {
        // So troca a tela se ainda nao havia nada: falha no meio do polling
        // mantem o que a pessoa ja estava vendo, e a proxima volta tenta de novo.
        setEstado((atual) => (atual.tipo === 'carregando' ? { tipo: 'falha' } : atual))
        return null
      }
      const visao = (await resposta.json()) as VisaoMapa
      setEstado({ tipo: 'ok', visao })
      return visao
    } catch {
      setEstado((atual) => (atual.tipo === 'carregando' ? { tipo: 'falha' } : atual))
      return null
    }
  }, [token])

  useEffect(() => {
    void buscar()
  }, [buscar])

  const visao = estado.tipo === 'ok' ? estado.visao : null

  // Pergunta de novo enquanto gera, ou enquanto espera o pagamento cair.
  useEffect(() => {
    if (!visao) return
    const gerando = visao.status === 'gerando'
    const esperandoPix = aguardandoPagamento && !visao.pago
    if (!gerando && !esperandoPix) return

    if (esperandoPix && inicioPagamento.current) {
      if (Date.now() - inicioPagamento.current > ESPERA_PAGAMENTO_MAX_MS) return
    }
    const t = setTimeout(
      () => void buscar(),
      gerando ? INTERVALO_GERANDO_MS : INTERVALO_PAGAMENTO_MS
    )
    return () => clearTimeout(t)
  }, [visao, aguardandoPagamento, buscar])

  // Voltou para a aba (pagou no app do banco): confere na hora.
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible' && aguardandoPagamento) void buscar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [aguardandoPagamento, buscar])

  if (estado.tipo === 'carregando') {
    return <main className={styles.wrap} />
  }

  if (estado.tipo === 'falha') {
    return (
      <main className={styles.wrap}>
        <Marca />
        <h1 className={styles.h1}>Não conseguimos abrir teu Mapa agora</h1>
        <p className={styles.sub}>Confira a internet e tente de novo. Teu Mapa continua guardado.</p>
        <button
          className={styles.btn}
          onClick={() => {
            setEstado({ tipo: 'carregando' })
            void buscar()
          }}
        >
          TENTAR DE NOVO
        </button>
      </main>
    )
  }

  if (estado.tipo === 'nao_encontrado' || !visao) {
    return (
      <main className={styles.wrap}>
        <Marca />
        <h1 className={styles.h1}>Mapa não encontrado</h1>
        <p className={styles.sub}>Confira o link ou gere o teu Mapa de novo.</p>
        <Link href="/mapa" className={styles.btn}>
          GERAR MEU MAPA
        </Link>
      </main>
    )
  }

  if (visao.status === 'gerando') return <Gerando visao={visao} />
  if (visao.status === 'erro') return <ErroGeracao visao={visao} aoTentar={buscar} />

  if (visao.pago && visao.conteudo) return <MapaAberto visao={visao} />
  if (visao.pago) return <PagoSemAcesso token={visao.token} />

  return (
    <Bloqueado
      visao={visao}
      aguardando={aguardandoPagamento}
      aoAbrirCheckout={() => {
        inicioPagamento.current = Date.now()
        setAguardandoPagamento(true)
      }}
      aoResgatar={buscar}
    />
  )
}

function Gerando({ visao }: { visao: VisaoMapa }) {
  const inicio = useRef(Date.now())
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSegundos((Date.now() - inicio.current) / 1000), 500)
    return () => clearInterval(t)
  }, [])

  const atual = AGENDA.reduce((acc, etapa, i) => (segundos >= etapa.aPartirDe ? i : acc), 0)
  const pct = AGENDA[atual].pct

  return (
    <main className={styles.wrap}>
      <Marca />
      <div className={`${styles.cardGerando} ${styles.step}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <CapaMapa tamanho={48} className={styles.capaPulso} />
          <div>
            <div className={styles.kicker}>MONTANDO SEU MAPA</div>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{visao.sintoma}</div>
          </div>
        </div>
        <div className={styles.prog}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', margin: '6px 0 16px' }}>
          {pct}%
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {ETAPAS.map((etapa, i) => (
            <div
              key={etapa}
              className={`${styles.gs} ${i < atual ? styles.gsDone : ''} ${i === atual ? styles.gsOn : ''}`}
            >
              <span className={styles.dot} />
              <span>{etapa}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingTop: 14,
            borderTop: '1px solid #f1f5f9'
          }}
        >
          <div className={styles.skTitle} style={{ width: '55%' }} />
          <div className={styles.sk} style={{ width: '100%' }} />
          <div className={styles.sk} style={{ width: '92%' }} />
          <div className={styles.sk} style={{ width: '97%' }} />
          <div className={styles.skTitle} style={{ width: '40%', marginTop: 6 }} />
          <div className={styles.sk} style={{ width: '100%' }} />
          <div className={styles.sk} style={{ width: '85%' }} />
        </div>
      </div>
      <p className={`${styles.hint} ${styles.hintCentro}`} style={{ marginTop: 14 }}>
        Não feche esta página. Leva menos de 1 minuto.
      </p>
    </main>
  )
}

function ErroGeracao({
  visao,
  aoTentar
}: {
  visao: VisaoMapa
  aoTentar: () => Promise<VisaoMapa | null>
}) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function tentar() {
    setEnviando(true)
    setErro(null)
    const resposta = await fetch(`/api/mapa/${visao.token}/gerar`, { method: 'POST' }).catch(
      () => null
    )
    if (!resposta?.ok) {
      const dados = (await resposta?.json().catch(() => ({}))) as { error?: string } | undefined
      setErro(dados?.error ?? 'Não foi possível tentar agora.')
      setEnviando(false)
      return
    }
    await aoTentar()
    setEnviando(false)
  }

  return (
    <main className={styles.wrap}>
      <Marca />
      <h1 className={styles.h1}>Teu Mapa travou no meio do caminho</h1>
      <p className={styles.sub}>
        Acontece de vez em quando. Tua resposta está guardada — é só tentar de novo.
      </p>
      <button className={styles.btn} onClick={() => void tentar()} disabled={enviando}>
        TENTAR DE NOVO
      </button>
      {erro ? <p className={styles.erro}>{erro}</p> : null}
    </main>
  )
}

function Bloqueado({
  visao,
  aguardando,
  aoAbrirCheckout,
  aoResgatar
}: {
  visao: VisaoMapa
  aguardando: boolean
  aoAbrirCheckout: () => void
  aoResgatar: () => Promise<VisaoMapa | null>
}) {
  const [mensagem, setMensagem] = useState(0)
  const [resgatando, setResgatando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aguardando) return
    const t = setInterval(() => setMensagem((m) => (m + 1) % MENSAGENS_PAGAMENTO.length), 1800)
    return () => clearInterval(t)
  }, [aguardando])

  function baixar() {
    if (!visao.checkoutUrl) return
    aoAbrirCheckout()
    // Outra aba: esta fica perguntando e vira o Mapa quando o Pix cair.
    // Sem 'noopener' nas features: com ele o window.open devolve null mesmo
    // abrindo, e nao daria para saber se o navegador bloqueou a aba.
    const aba = window.open(visao.checkoutUrl, '_blank')
    if (aba) aba.opener = null
    else window.location.href = visao.checkoutUrl
  }

  async function resgatar() {
    setResgatando(true)
    setErro(null)
    const resposta = await fetch(`/api/mapa/${visao.token}/resgatar`, { method: 'POST' }).catch(
      () => null
    )
    if (!resposta?.ok) {
      const dados = (await resposta?.json().catch(() => ({}))) as { error?: string } | undefined
      setErro(dados?.error ?? 'Não foi possível liberar agora.')
      setResgatando(false)
      return
    }
    await aoResgatar()
  }

  const textoMensagem =
    MENSAGENS_PAGAMENTO[mensagem] === 'Pix ou cartão'
      ? `${visao.preco} · Pix ou cartão`
      : MENSAGENS_PAGAMENTO[mensagem]

  return (
    <main className={styles.wrap}>
      <Marca />
      <div className={styles.okTitulo}>
        <span className={styles.okIcone}>
          <Check size={16} strokeWidth={3} />
        </span>
        <span>Pronto, {visao.nome}!</span>
      </div>

      <div className={styles.cardBloqueado}>
        <div className={styles.capaLinha}>
          <CapaMapa tamanho={72} className={styles.capaImg} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className={styles.kicker}>MAPA DA ORIGEM EMOCIONAL</span>
            <span className={styles.capaTitulo}>{visao.sintomaTitulo}</span>
            <span className={styles.capaMeta}>Mapa de {visao.nome} · 14 páginas</span>
          </div>
        </div>
        {/* Decoracao: o conteudo real nunca chega a este navegador antes do pagamento. */}
        <div className={styles.borrado} aria-hidden>
          <div className={styles.linhaTitulo} style={{ width: '60%', marginTop: 0 }} />
          <div style={{ width: '100%' }} />
          <div style={{ width: '92%' }} />
          <div style={{ width: '97%' }} />
          <div className={styles.linhaTitulo} style={{ width: '48%' }} />
          <div style={{ width: '100%' }} />
          <div style={{ width: '88%' }} />
          <div style={{ width: '95%' }} />
          <div className={styles.linhaTitulo} style={{ width: '55%' }} />
          <div style={{ width: '100%' }} />
          <div style={{ width: '90%' }} />
        </div>
        <div className={styles.veu}>
          <Lock size={14} strokeWidth={2.5} />
          <span>Conteúdo bloqueado</span>
        </div>
      </div>

      {visao.podeResgatar ? (
        <>
          <button className={styles.btn} onClick={() => void resgatar()} disabled={resgatando}>
            LIBERAR COM MEU PAGAMENTO
          </button>
          {erro ? <p className={styles.erro}>{erro}</p> : null}
        </>
      ) : (
        <>
          <button className={styles.btn} onClick={baixar} style={{ marginTop: 24 }}>
            BAIXAR MEU MAPA
          </button>
          {aguardando ? (
            <>
              <div className={styles.liberando}>
                <span className={styles.spinBranco} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Liberando seu Mapa…</div>
                  <small>{textoMensagem}</small>
                </div>
              </div>
              <p className={styles.manual}>
                Se não abrir automaticamente,{' '}
                <a href={visao.checkoutUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                  clique aqui
                </a>
                . Depois de pagar, volte para esta página.
              </p>
            </>
          ) : null}
          <div className={styles.selos}>
            <span className={styles.selo}>
              <Zap size={13} strokeWidth={3} />
              ACESSO IMEDIATO
            </span>
            <span className={styles.preco}>{visao.preco} · Pix ou cartão</span>
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />
      <p className={styles.rodape} style={{ marginTop: 32 }}>
        O mesmo mapa que terapeutas usam nos atendimentos.
      </p>
    </main>
  )
}

function MapaAberto({ visao }: { visao: VisaoMapa }) {
  return (
    <main className={`${styles.wrap} ${styles.wrapLargo}`}>
      <section className={`${styles.entrega} ${styles.naoImprime}`}>
        <Marca />
        <h1>Teu Mapa está pronto, {visao.nome}.</h1>
        <p>
          {visao.emailEntrega ? (
            <>
              Enviei uma cópia pro <b>{visao.emailEntrega}</b>.{' '}
            </>
          ) : null}
          E ele fica guardado pra sempre na tua Biblioteca do meDIZ! — se perder, está lá.
        </p>
        <div className={styles.acoes}>
          <button type="button" className={styles.acaoDiscreta} onClick={() => window.print()}>
            <Download size={16} />
            Baixar PDF
          </button>
          <Link
            href={visao.ehDono ? '/biblioteca' : `/login?next=${encodeURIComponent('/biblioteca')}`}
            className={styles.acaoDiscreta}
          >
            <Library size={16} />
            Ver na Biblioteca
          </Link>
        </div>
      </section>

      <MapaDocumento
        conteudo={visao.conteudo as ConteudoMapa}
        nome={visao.nome}
        criadoEm={visao.criadoEm}
        chaveMarcacoes={visao.token}
      />
    </main>
  )
}

function PagoSemAcesso({ token }: { token: string }) {
  const destino = `/mapa/${token}`
  return (
    <main className={styles.wrap}>
      <Marca />
      <h1 className={styles.h1}>Este Mapa já foi liberado</h1>
      <p className={styles.sub}>
        Entre na tua conta para ler. O link de acesso também foi enviado pro teu e-mail e pro teu
        WhatsApp.
      </p>
      <Link href={`/login?next=${encodeURIComponent(destino)}`} className={styles.btn}>
        ENTRAR
      </Link>
    </main>
  )
}
