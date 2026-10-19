'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { ConteudoMapa, NoArvore } from '@/lib/mapa/conteudo'
import styles from './MapaDocumento.module.css'

/**
 * O Mapa da Origem Emocional renderizado a partir do JSON do gerador.
 *
 * O que muda por pessoa vem de `conteudo`; o resto (regra de leitura, rotulos
 * das fases, caminho [RE]Sentir, portas, rodape) e fixo aqui. Mesmo layout do
 * exemplo aprovado, para a tela, a Biblioteca e a impressao em PDF.
 *
 * As caixas de marcar funcionam de verdade e ficam guardadas no aparelho: o
 * Mapa e para reler daqui a 30 e 90 dias, e reencontrar o que marcou e parte
 * da releitura.
 */

type Props = {
  conteudo: ConteudoMapa
  nome: string
  criadoEm: string
  /** Chave das marcacoes no aparelho (o token do Mapa). */
  chaveMarcacoes?: string
}

const AUDIOTERAPIA_URL = 'https://go.ocorpodiz.com.br/pay/audsentbio'

const ROTULO_NO: Record<NoArvore, string> = {
  avo_paterno: 'avô paterno',
  avo_paterna: 'avó paterna',
  avo_materno: 'avô materno',
  avo_materna: 'avó materna',
  pai: 'pai',
  mae: 'mãe',
  tios: 'tios/tias',
  irmaos: 'irmãos'
}

/** `**trecho**` vira destaque — o unico markup que o gerador pode usar. */
function Rico({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {partes.map((parte, i) =>
        i % 2 === 1 ? <b key={i}>{parte}</b> : <Fragment key={i}>{parte}</Fragment>
      )}
    </>
  )
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return ''
  }
}

function useMarcacoes(chave: string | undefined) {
  const storageKey = chave ? `mapa-marcas:${chave}` : null
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!storageKey) return
    try {
      const salvo = window.localStorage.getItem(storageKey)
      if (salvo) setMarcadas(new Set(JSON.parse(salvo) as string[]))
    } catch {
      // Sem storage (aba privada, bloqueio): marca so nesta visita.
    }
  }, [storageKey])

  function alternar(id: string) {
    setMarcadas((atual) => {
      const nova = new Set(atual)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify([...nova]))
        } catch {
          // idem
        }
      }
      return nova
    })
  }

  return { marcadas, alternar }
}

function ListaMarcavel({
  itens,
  prefixo,
  marcadas,
  alternar,
  aspas = false
}: {
  itens: string[]
  prefixo: string
  marcadas: Set<string>
  alternar: (id: string) => void
  aspas?: boolean
}) {
  return (
    <ul className={styles.check}>
      {itens.map((item, i) => {
        const id = `${prefixo}:${i}`
        const on = marcadas.has(id)
        return (
          <li key={id}>
            <button
              type="button"
              className={`${styles.box} ${on ? styles.boxOn : ''}`}
              aria-pressed={on}
              aria-label={on ? 'Desmarcar' : 'Marcar'}
              onClick={() => alternar(id)}
            >
              {on ? <Check size={14} strokeWidth={3} /> : null}
            </button>
            <span>{aspas ? <>&ldquo;<Rico texto={item} />&rdquo;</> : <Rico texto={item} />}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Linhas({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={styles.blank} />
      ))}
    </>
  )
}

export function MapaDocumento({ conteudo: c, nome, criadoEm, chaveMarcacoes }: Props) {
  const { marcadas, alternar } = useMarcacoes(chaveMarcacoes)
  const orgao = c.sentido_biologico.orgao
  const arvore = c.programa_familiar.arvore ?? {}

  const no = (id: NoArvore): ReactNode => (
    <div className={styles.node}>
      {ROTULO_NO[id]}
      {arvore[id] ? <small>{arvore[id]}</small> : null}
    </div>
  )

  const [primeiroParagrafo, ...demaisParagrafos] = c.carta.paragrafos

  return (
    <article className={styles.doc}>
      {/* 1 · CAPA */}
      <section className={styles.cover}>
        <div className={styles.coverBrand}>
          meDIZ<span>!</span>
        </div>
        <h1>Mapa da Origem Emocional</h1>
        <p className={styles.coverSub}>
          O mapa completo e personalizado que terapeutas usam nos atendimentos.
        </p>
        <div className={styles.meta}>
          <span>{nome}</span>
          <span>
            {c.capa.sintoma_titulo}
            {c.capa.desde ? ` · ${c.capa.desde}` : ''}
          </span>
          <span>Gerado em {formatarData(criadoEm)}</span>
        </div>
        <p className={styles.cap}>
          O corpo não erra. O que ele faz, faz para você sobreviver. Este Mapa é a tradução.
        </p>
      </section>

      {/* 2 · CARTA */}
      <section className={`${styles.card} ${styles.letter}`}>
        <p>{nome},</p>
        <p>
          <Rico texto={primeiroParagrafo} />
        </p>
        <p>Leia devagar. Com caneta. Marque tudo que te fizer parar.</p>
        {demaisParagrafos.map((p, i) => (
          <p key={i}>
            <Rico texto={p} />
          </p>
        ))}
        <p className={styles.sig}>— Prof. Paulo Barbosa</p>
      </section>

      {/* PARTE I */}
      <div className={styles.part}>PARTE I · RECONHECIMENTO</div>
      <h2>O que o teu corpo está dizendo</h2>
      <p className={styles.lead}>Marca o que é teu. Sem pensar muito.</p>
      <div className={styles.card}>
        <ListaMarcavel
          itens={c.reconhecimento.afirmacoes}
          prefixo="reconhecimento"
          marcadas={marcadas}
          alternar={alternar}
        />
      </div>
      <div className={styles.q}>
        <Rico texto={c.reconhecimento.fechamento} />
      </div>

      <h2>A linguagem popular já sabia</h2>
      <p className={styles.lead}>Frases que a gente diz sem perceber — e que o corpo escuta.</p>
      <div className={`${styles.card} ${styles.popular}`}>
        {c.linguagem_popular.frases.map((f, i) => (
          <p key={i}>&ldquo;{f}&rdquo;</p>
        ))}
      </div>
      <div className={styles.q}>Qual dessas você já disse em voz alta? Pra quem?</div>

      {/* PARTE II */}
      <div className={styles.part}>PARTE II · COMPREENSÃO</div>
      <h2>O que {orgao} tentou resolver</h2>
      {c.sentido_biologico.paragrafos.map((p, i) => (
        <p key={i}>
          <Rico texto={p} />
        </p>
      ))}
      <div className={styles.key}>
        <Rico texto={c.sentido_biologico.frase_sintese} />
      </div>

      <h2>O conflito específico</h2>
      <p className={styles.lead}>Aqui a leitura fica sobre você, não sobre o sintoma.</p>
      <div className={styles.card}>
        <span className={styles.tag}>O QUE COSTUMA ESTAR NA RAIZ</span>
        <p>
          <Rico texto={c.conflito.raiz} />
        </p>
        <p>Três histórias típicas de quem carrega isso:</p>
        {c.conflito.cenarios.map((cenario, i) => (
          <div key={i} className={styles.step}>
            <div className={styles.n}>{i + 1}</div>
            <p>
              <Rico texto={cenario} />
            </p>
          </div>
        ))}
      </div>
      {c.conflito.leitura_pessoal ? (
        <div className={styles.q}>
          <Rico texto={c.conflito.leitura_pessoal} />
        </div>
      ) : null}
      <div className={styles.key}>
        A pergunta-chave do método:{' '}
        <b>o que aconteceu, com quem — e o que você não pôde fazer ou dizer?</b>
        <br />
        <br />
        <Rico texto={c.conflito.pergunta_chave} />
      </div>

      <h2>Desde quando</h2>
      <p className={styles.lead}>
        O corpo guarda a data. O sintoma aparece <em>depois</em> da luta, não durante.
      </p>
      <div className={styles.card}>
        <div className={styles.timeline}>
          {c.linha_do_tempo.marcos.map((m, i) => (
            <div key={i} className={`${styles.tl} ${m.aberto ? styles.tlOpen : ''}`}>
              <div className={styles.tlY}>{m.rotulo}</div>
              <div className={styles.tlT}>
                <Rico texto={m.texto} />
              </div>
              {m.aberto ? <Linhas n={2} /> : null}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.q}>
        <Rico texto={c.linha_do_tempo.pergunta} />
      </div>

      <h2>A fase em que o corpo está</h2>
      <p className={styles.lead}>Isso muda o que fazer.</p>
      <div className={styles.card}>
        <div className={styles.grid2}>
          <div className={styles.cell}>
            <b>LUTA ATIVA</b>
            {c.fase.sinais_luta}
          </div>
          <div className={styles.cell}>
            <b>REPARAÇÃO</b>
            {c.fase.sinais_reparacao}
          </div>
        </div>
        <p className={styles.small}>
          <Rico texto={c.fase.leitura} />
        </p>
      </div>
      <div className={styles.q}>Hoje, nesta semana: você está em luta ou em reparação?</div>

      <h2>Repetição: quando volta mais forte</h2>
      <div className={styles.card}>
        {c.repeticao.lateralidade ? (
          <p>
            <Rico texto={c.repeticao.lateralidade} />
          </p>
        ) : null}
        <p>
          <Rico texto={c.repeticao.texto} />
        </p>
      </div>
      <div className={styles.q}>
        <Rico texto={c.repeticao.pergunta} />
      </div>

      {/* PARTE III */}
      <div className={styles.part}>PARTE III · RAÍZES</div>
      <h2>O programa que veio antes de você</h2>
      <p>
        <Rico texto={c.programa_familiar.texto} />
      </p>
      <div className={styles.card}>
        <p className={styles.note}>
          <Rico texto={c.programa_familiar.instrucao} />
        </p>
        <div className={styles.tree}>
          <div className={styles.treeRow}>
            {no('avo_paterno')}
            {no('avo_paterna')}
            {no('avo_materno')}
            {no('avo_materna')}
          </div>
          <div className={styles.treeRow}>
            {no('pai')}
            {no('mae')}
            {no('tios')}
          </div>
          <div className={styles.treeRow}>
            <div className={`${styles.node} ${styles.nodeMe}`}>{nome.toUpperCase()}</div>
            {no('irmaos')}
          </div>
        </div>
      </div>
      <div className={styles.q}>
        <Rico texto={c.programa_familiar.pergunta} />
      </div>

      <h2>As crenças que sustentam o sintoma</h2>
      <p className={styles.lead}>
        Frases que ficaram ligadas por dentro. Marque as tuas — e de quem você ouviu primeiro.
      </p>
      <div className={styles.card}>
        <ListaMarcavel
          itens={c.crencas.itens}
          prefixo="crencas"
          marcadas={marcadas}
          alternar={alternar}
          aspas
        />
        <p className={styles.note}>
          Ao lado de cada uma que marcou, escreve: <em>de quem eu ouvi isso?</em>
        </p>
        <Linhas n={2} />
      </div>

      {/* PARTE IV */}
      <div className={styles.part}>PARTE IV · CAMINHO</div>
      <h2>O que o teu corpo pede</h2>
      <p className={styles.lead}>Se {orgao} falasse, em primeira pessoa:</p>
      <div className={`${styles.card} ${styles.bodySays}`}>
        {c.corpo_pede.pedidos.map((p, i) => (
          <p key={i}>
            &ldquo;<Rico texto={p} />&rdquo;
          </p>
        ))}
      </div>

      <h2>Primeiros passos — e o caminho completo</h2>
      <div className={styles.card}>
        {c.primeiros_passos.passos.map((passo, i) => (
          <div key={i} className={styles.step}>
            <div className={styles.n}>{i + 1}</div>
            <p>
              <b>{passo.titulo}</b> <Rico texto={passo.texto} />
            </p>
          </div>
        ))}
        <p className={`${styles.small} ${styles.note}`}>
          Isso é consciência. Soltar o que ficou registrado é outro trabalho — o do Método
          [RE]Sentir, que vai da identificação do conflito à liberação da informação que o corpo
          guardou. Três portas pra seguir:
        </p>
        <div className={styles.door}>
          <a href={AUDIOTERAPIA_URL} target="_blank" rel="noopener noreferrer">
            <b>Audioterapia Sentido Biológico</b> · a terapia gravada do Prof. pra quem já mapeou
            a origem e quer soltar
          </a>
          <a href="/simulador">
            <b>Simulador de Atendimentos no meDIZ!</b> · veja passo a passo como um terapeuta
            conduziria o teu caso
          </a>
          <span>
            <b>Terapeuta credenciado [RE]Sentir</b> · quando quiser fazer o trabalho acompanhado
          </span>
        </div>
      </div>

      <h2>Para reler daqui a 30 e 90 dias</h2>
      <div className={styles.card}>
        <p className={styles.note}>Este Mapa muda com você. Volta aqui e responde:</p>
        <p>
          <b>Em 30 dias</b> — {c.releitura.pergunta_30}
        </p>
        <Linhas n={2} />
        <p>
          <b>Em 90 dias</b> — {c.releitura.pergunta_90}
        </p>
        <Linhas n={2} />
        <p>
          <b>O que eu ainda não consegui responder:</b>
        </p>
        <Linhas n={1} />
      </div>

      {/* ENCERRAMENTO */}
      <div className={styles.quote}>
        &ldquo;{c.citacao_final}&rdquo;
        <span>— O Corpo Diz, Prof. Paulo Barbosa</span>
      </div>
      <div className={styles.foot}>
        Teu Mapa fica guardado pra sempre na Biblioteca do meDIZ!
        <br />
        mediz.app · Universidade de Terapias
      </div>
      <p className={styles.caution}>
        Este material é uma leitura emocional e simbólica. Não é diagnóstico médico, não substitui
        acompanhamento clínico e não orienta mudanças em medicação ou tratamento.
      </p>
    </article>
  )
}
