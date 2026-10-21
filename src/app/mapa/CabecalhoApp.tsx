'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ChatAppHeader } from '@/components/chat/ChatAppHeader'

const CHAVE = 'mapa-origem-app'

/**
 * Cabecalho do app nas paginas do Mapa, so para quem entrou pelo botao
 * "Gerar mapa personalizado" do /chat (`?origem=app`). Quem chega pelo link do
 * WhatsApp segue vendo a pagina limpa, sem menu.
 *
 * A origem fica na sessionStorage para sobreviver a ida do quiz para
 * /mapa/<token>, que nao carrega mais o parametro.
 */
export function CabecalhoApp() {
  const router = useRouter()
  const [doApp, setDoApp] = useState(false)

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('origem') === 'app') {
        sessionStorage.setItem(CHAVE, '1')
      }
      setDoApp(sessionStorage.getItem(CHAVE) === '1')
    } catch {
      // Sem storage (aba privada etc.): sem cabecalho, a pagina segue funcionando.
    }
  }, [])

  // Sinaliza para o CSS do Mapa esconder a marca do quiz (`[data-mapa-app]`).
  useEffect(() => {
    if (!doApp) return
    document.documentElement.dataset.mapaApp = '1'
    return () => {
      delete document.documentElement.dataset.mapaApp
    }
  }, [doApp])

  if (!doApp) return null

  return (
    <ChatAppHeader
      onBack={() => router.push('/chat')}
      onSuggestion={() => router.push('/suggestion')}
    />
  )
}
