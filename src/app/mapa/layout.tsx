import type { Metadata } from 'next'
import { Lora, Plus_Jakarta_Sans } from 'next/font/google'
import styles from './mapa.module.css'

/**
 * Paginas do Mapa da Origem Emocional: venda (publica, sem menu) e leitura.
 * Fontes do design aprovado — Plus Jakarta Sans nas telas, Lora nas citacoes
 * do documento.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta'
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['500'],
  style: ['normal', 'italic'],
  variable: '--font-lora'
})

export const metadata: Metadata = {
  title: 'Mapa da Origem Emocional — meDIZ!',
  description: 'O mapa completo e personalizado que terapeutas usam nos atendimentos.',
  // Chega por link do WhatsApp; nao e pagina para buscador.
  robots: { index: false, follow: false }
}

export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${jakarta.variable} ${lora.variable} ${styles.fundo}`}>{children}</div>
}
