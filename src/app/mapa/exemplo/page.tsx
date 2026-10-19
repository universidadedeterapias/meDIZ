import { notFound } from 'next/navigation'
import { MapaDocumento } from '@/components/mapa/MapaDocumento'
import { EXEMPLO_CONTEUDO, EXEMPLO_ENTRADA } from '@/lib/mapa/exemplo'
import styles from '../mapa.module.css'

/**
 * Pre-visualizacao do template com o Mapa de exemplo aprovado (Rafael).
 * Para comparar o layout com o artifact e revisar mudancas no `MapaDocumento`.
 * Fora de producao, a nao ser que MAPA_EXEMPLO_PUBLICO=1.
 */
export const dynamic = 'force-dynamic'

export default function MapaExemploPage() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MAPA_EXEMPLO_PUBLICO?.trim() !== '1'
  ) {
    notFound()
  }

  return (
    <main className={`${styles.wrap} ${styles.wrapLargo}`}>
      <MapaDocumento
        conteudo={EXEMPLO_CONTEUDO}
        nome={EXEMPLO_ENTRADA.nome}
        criadoEm="2026-10-14T12:00:00-03:00"
        chaveMarcacoes="exemplo"
      />
    </main>
  )
}
