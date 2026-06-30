// src/app/chat/page.tsx
'use client'

/// <reference lib="dom" />

import { Bell, MessageSquarePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ClientOnly } from '@/components/ClientOnly'
import { ChatHomeExperience } from '@/components/chat/ChatHomeExperience'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { Footer } from '@/components/Footer'
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder'
import PromotionPopup from '@/components/PromotionPopup'
import Spinner from '@/components/Spinner'
import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { Button } from '@/components/ui/button'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { UserPeriod } from '@/lib/userPeriod'
import { FirstName } from '@/lib/utils'
import { getUpgradeLink } from '@/lib/upgradeLinks'
import { User } from '@/types/User'
import { Result } from './result'

// Tipo exato que vem da sua API
type RawUser = {
  image: string
  name?: string
  fullName?: string
  email?: string
  age?: number
  gender?: string
  profession?: string
  appUsage?: string
  description?: string
}

// Tipo que vamos usar internamente, sempre com name/fullName definidos

export default function Page() {
  const router = useRouter()
  const { t, language } = useTranslation()

  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [originalQuestion, setOriginalQuestion] = useState<string>('')
  
  // Estados relacionados às regras de uso do plano gratuito
  const [userPeriod, setUserPeriod] = useState<'first-week' | 'first-month' | 'beyond-month'>('first-week')
  const [fullVisualization, setFullVisualization] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  
  // 1) Confira perfil e normalize o nome
  useEffect(() => {
    let cancelled = false

    async function checkUserProfile() {
      try {
        // Timeout de 30 segundos para carregamento de usuário
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
        
        const res = await fetch('/api/user', {
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId)
        })
        if (!res.ok) {
          router.replace('/login')
          return
        }
        const raw: RawUser = await res.json()

        // checa se faltam campos obrigatórios do form
        const missing =
          !raw.fullName ||
          !raw.age ||
          !raw.gender ||
          !raw.profession ||
          !raw.appUsage ||
          !raw.description

        if (missing) {
          router.replace('/form')
          return
        }

        if (!cancelled) {
          // escolhe fullName se existir, senão name
          const display = raw.fullName ?? raw.name ?? ''
          setUser({
            image: raw.image,
            // garantimos que ambos existam para os componentes que usam name/fullName
            name: display,
            fullName: display,
            email: raw.email!,
            age: raw.age!,
            gender: raw.gender!,
            profession: raw.profession!,
            appUsage: raw.appUsage!,
            description: raw.description!
          })
          setCheckingProfile(false)
        }
      } catch {
        router.replace('/form')
      }
    }

    checkUserProfile()
    return () => {
      cancelled = true
    }
  }, [router])

  // 2) Carrega respostas do chat quando selecionar uma thread
  useEffect(() => {
    if (checkingProfile || !selectedThread) return
    let cancelled = false
    setLoading(true)

    // Timeout de 60 segundos para carregamento de mensagens
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
    
    fetch(`/api/openai/messages?threadId=${selectedThread}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setResponses(data.responses.assistant || [])
      })
      .catch(console.error)
      .finally(() => {
        clearTimeout(timeoutId)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [checkingProfile, selectedThread])

  // 3) Envia mensagem
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return // Evita múltiplas chamadas
    handleSendMessageFromText(input.trim())
  }

  // Função reutilizável para enviar mensagem
  const handleSendMessageFromText = async (text: string) => {
    if (loading) return
    setLoading(true)
    setResponses([])
    setElapsedMs(null)
    
    // Armazena a pergunta original para o PDF
    setOriginalQuestion(text)
    setInput(text) // Atualiza o input

    const t0 = performance.now()

    try {
      // Timeout de 60 segundos para requisições de chat
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
      
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Inclui cookies na requisição
        signal: controller.signal,
        body: JSON.stringify({ message: text, language })
      }).finally(() => {
        clearTimeout(timeoutId)
      })

      // Verifica se houve erro de autenticação
      if (res.status === 401) {
        console.error('[Chat] Não autenticado, redirecionando para login...')
        router.replace('/login')
        setLoading(false)
        return
      }

      if (res.status === 403) {
        const data = await res.json()
        if (data.limitReached) {
          setLimitReached(true)
          setLoading(false)
          return
        }
      }

      // Verifica se a resposta é JSON válida
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Chat] Erro na API:', res.status, errorText)
        throw new Error(`Erro na API: ${res.status} - ${errorText}`)
      }

      const data = await res.json()

      if (data.threadId) {
        setSelectedThread(data.threadId)
      }
      
      // Processa informações do período do usuário e visualização
      if (data.userPeriod) {
        setUserPeriod(data.userPeriod as UserPeriod)
        setFullVisualization(data.fullVisualization || false)
      }
      
      // Verifica se deve mostrar o popup entre pesquisas
      if (data.shouldShowPopup) {
        // Atrasa a exibição do popup para após a exibição da resposta
        setTimeout(() => {
          setShowPopup(true)
        }, 2000)
      }
      
      // Valida e processa as respostas
      if (data.responses?.assistant && Array.isArray(data.responses.assistant) && data.responses.assistant.length > 0) {
        setResponses(data.responses.assistant)
      } else if (data.responses?.assistant && typeof data.responses.assistant === 'string') {
        // Fallback: se assistant for uma string ao invés de array
        setResponses([data.responses.assistant])
      } else {
        console.error('[Chat] Resposta inválida ou vazia')
        throw new Error('Resposta inválida do servidor')
      }
      const t1 = performance.now()
      setElapsedMs(t1 - t0)
    } catch (err) {
      // Evita logar objetos Event diretamente
      if (err instanceof Error) {
        console.error('[Chat] Erro ao enviar mensagem:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        })
        alert(`${t('chat.error.prefix', 'Erro ao processar sua mensagem')}: ${err.message}`)
      } else if (err && typeof err === 'object' && 'type' in err) {
        // Pode ser um Event object
        console.error('[Chat] Erro (tipo: Event):', (err as { type?: string }).type || 'Unknown')
        alert(t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.'))
      } else {
        console.error('[Chat] Erro ao enviar mensagem:', err)
        alert(t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.'))
      }
    } finally {
      setInput('')
      setLoading(false)
    }
  }
  
  // Função para lidar com clique no botão de assinatura
  const handleSubscribe = () => {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  // Loading enquanto checa o perfil
  if (checkingProfile || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-indigo-600 to-purple-600 p-6 sm:p-8">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-zinc-100 font-bold text-6xl drop-shadow-lg">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div className="w-full flex items-center justify-center mt-14">
            <Spinner size={48} />
          </div>
        </div>
        <p className="text-zinc-100 text-lg font-bold">
          {t('chat.loading.welcome', 'Bem-vindo!')}
        </p>
      </div>
    )
  }

  if (limitReached) {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  // Layout principal do chat
  return (
    <SidebarProvider>
      <AppSidebar
        history={[]} // implemente seu histórico se quiser
        selectedThread={selectedThread}
        onSelectSession={setSelectedThread}
        onSelectSymptom={(symptomText) => {
          setInput(symptomText)
          setResponses([])
          setSelectedThread(null)
          handleSendMessageFromText(symptomText)
        }}
      />

      <SidebarInset className="min-w-0 overflow-x-hidden">
        <div className="flex min-h-svh flex-col bg-background text-foreground">
          <header className="sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between bg-background/80 px-2 shadow-lg shadow-violet-950/5 backdrop-blur-xl dark:shadow-black/20 sm:px-4">
            <SidebarTrigger className="shrink-0 text-violet-700 dark:text-violet-300" />

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
              <MedizChatV2Logo />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.push('/suggestion')}
                className="text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-950"
                aria-label={t('sidebar.suggestion.button', 'Sugestão')}
              >
                <MessageSquarePlus className="size-4" />
              </Button>
              <div className="hidden sm:block">
                <LanguageSwitcher showLabel={false} variant="header" />
              </div>
              <ThemeToggle variant="icon" />
              <button
                type="button"
                className="relative hidden min-h-11 min-w-11 items-center justify-center text-violet-700 dark:text-violet-300 sm:flex"
                aria-label={t('notifications.title', 'Notificações')}
              >
                <Bell className="size-5" />
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-amber-400" />
              </button>
            </div>
          </header>

          <main className="flex w-full flex-1 flex-col overflow-x-hidden bg-gradient-to-br from-violet-50/90 via-background to-fuchsia-50/70 dark:from-violet-950/25 dark:via-background dark:to-fuchsia-950/20">
            {loading ? (
              <div className="mx-auto flex w-full max-w-4xl flex-1 px-3 pb-6 sm:px-4">
                <ClientOnly>
                  <LoadingPlaceholder />
                </ClientOnly>
              </div>
            ) : responses.length === 0 ? (
              <ChatHomeExperience
                userName={FirstName(user.name)}
                input={input}
                loading={loading}
                onInputChange={setInput}
                onSubmit={handleSendMessage}
              />
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 py-5 sm:px-4 sm:py-7">
                <div className="space-y-4">
                  {responses.map((md, idx) => (
                    <Result
                      key={idx}
                      markdown={md}
                      elapsedMs={elapsedMs ?? 0}
                      userPeriod={userPeriod}
                      fullVisualization={fullVisualization}
                      onSubscribe={handleSubscribe}
                      userQuestion={originalQuestion}
                      sessionId={selectedThread || undefined}
                    />
                  ))}
                </div>

                <ChatComposer
                  value={input}
                  loading={loading}
                  onChange={setInput}
                  onSubmit={handleSendMessage}
                  placeholder={t('chat.home.input.continue', 'Continue a conversa…')}
                  className="sticky bottom-3 z-10 mt-6"
                />
              </div>
            )}
            
            {/* Pop-up entre pesquisas */}
            <PromotionPopup
              open={showPopup}
              onOpenChange={setShowPopup}
              onSubscribe={handleSubscribe}
            />
          </main>

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
