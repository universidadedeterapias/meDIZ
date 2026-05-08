// src/app/chat/page.tsx
'use client'

/// <reference lib="dom" />

import { ArrowRight, Bell, Search, MessageSquarePlus, GraduationCap, Headset, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { ExternalLinks } from '@/components/ExternalLinks'
import { Footer } from '@/components/Footer'
import PromotionPopup from '@/components/PromotionPopup'
import Spinner from '@/components/Spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
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

type AgentMode = 'chat' | 'professor' | 'simulador'
type ConversationBubble = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const createClientMessageId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const AGENT_MODE_CONFIG: Record<
  AgentMode,
  {
    label: string
    endpoint: string
    greetingPrompt: string
  }
> = {
  chat: {
    label: 'Chat meDIZ',
    endpoint: '/api/openai',
    greetingPrompt: 'Quero uma leitura terapêutica no chat principal.'
  },
  professor: {
    label: 'Professor',
    endpoint: '/api/professor-paulo',
    greetingPrompt: 'Quero conversar com o Professor hoje.'
  },
  simulador: {
    label: 'Simulador de atendimento',
    endpoint: '/api/meatende',
    greetingPrompt: 'Quero treinar no Simulador de atendimento.'
  }
}

export default function Page() {
  const router = useRouter()
  const { user: userContext } = useUser()
  const { t, language } = useTranslation()

  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [originalQuestion, setOriginalQuestion] = useState<string>('')
  
  // Estados relacionados às regras de uso do plano gratuito
  const [userPeriod, setUserPeriod] = useState<'first-week' | 'first-month' | 'beyond-month'>('first-week')
  const [fullVisualization, setFullVisualization] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('chat')
  const [agentThreads, setAgentThreads] = useState<Record<AgentMode, string | null>>({
    chat: null,
    professor: null,
    simulador: null
  })
  const [messagesByAgent, setMessagesByAgent] = useState<Record<AgentMode, ConversationBubble[]>>({
    chat: [],
    professor: [],
    simulador: []
  })
  const [chatResponses, setChatResponses] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  
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

  // Função reutilizável para enviar mensagem
  const handleSendMessageFromText = async (text: string, targetMode: AgentMode = agentMode) => {
    if (loading || !text.trim()) return
    const message = text.trim()
    setAgentMode(targetMode)
    setLoading(true)
    if (targetMode === 'chat') {
      setChatResponses([])
    } else {
      setMessagesByAgent((prev) => ({
        ...prev,
        [targetMode]: [...prev[targetMode], { id: createClientMessageId(), role: 'user', content: message }]
      }))
    }
    setElapsedMs(null)
    
    // Armazena a pergunta original para o PDF
    setOriginalQuestion(message)
    setInput('')

    const t0 = performance.now()

    try {
      // Timeout de 60 segundos para requisições de chat
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
      
      const isMainChat = targetMode === 'chat'
      const res = await fetch(AGENT_MODE_CONFIG[targetMode].endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Inclui cookies na requisição
        signal: controller.signal,
        body: JSON.stringify({
          message,
          language,
          threadId: isMainChat ? undefined : agentThreads[targetMode] || undefined
        })
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

      if (typeof data.threadId === 'string' && data.threadId) {
        setAgentThreads((prev) => ({ ...prev, [targetMode]: data.threadId }))
      }
      
      // Processa informações do período do usuário e visualização
      if (isMainChat && data.userPeriod) {
        setUserPeriod(data.userPeriod as UserPeriod)
        setFullVisualization(data.fullVisualization || false)
      }
      
      // Verifica se deve mostrar o popup entre pesquisas
      if (isMainChat && data.shouldShowPopup) {
        // Atrasa a exibição do popup para após a exibição da resposta
        setTimeout(() => {
          setShowPopup(true)
        }, 2000)
      }
      
      // Valida e processa as respostas
      if (isMainChat && data.responses?.assistant && Array.isArray(data.responses.assistant) && data.responses.assistant.length > 0) {
        setChatResponses(data.responses.assistant)
      } else if (isMainChat && data.responses?.assistant && typeof data.responses.assistant === 'string') {
        setChatResponses([data.responses.assistant])
      } else if (!isMainChat) {
        const latestAssistantReply =
          typeof data?.latestAssistantReply === 'string' && data.latestAssistantReply.trim().length > 0
            ? data.latestAssistantReply
            : Array.isArray(data?.responses?.assistant)
              ? String(data.responses.assistant[data.responses.assistant.length - 1] || '')
              : typeof data?.responses?.assistant === 'string'
                ? data.responses.assistant
                : ''

        if (latestAssistantReply.trim().length > 0) {
          setMessagesByAgent((prev) => ({
            ...prev,
            [targetMode]: [
              ...prev[targetMode],
              { id: createClientMessageId(), role: 'assistant', content: latestAssistantReply }
            ]
          }))
        } else {
          throw new Error('Resposta inválida do servidor')
        }
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
        if (targetMode !== 'chat') {
          setMessagesByAgent((prev) => ({
            ...prev,
            [targetMode]: [
              ...prev[targetMode],
              {
                id: createClientMessageId(),
                role: 'assistant',
                content: t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.')
              }
            ]
          }))
        }
      } else if (err && typeof err === 'object' && 'type' in err) {
        // Pode ser um Event object
        console.error('[Chat] Erro (tipo: Event):', (err as { type?: string }).type || 'Unknown')
        alert(t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.'))
        if (targetMode !== 'chat') {
          setMessagesByAgent((prev) => ({
            ...prev,
            [targetMode]: [
              ...prev[targetMode],
              {
                id: createClientMessageId(),
                role: 'assistant',
                content: t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.')
              }
            ]
          }))
        }
      } else {
        console.error('[Chat] Erro ao enviar mensagem:', err)
        alert(t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.'))
        if (targetMode !== 'chat') {
          setMessagesByAgent((prev) => ({
            ...prev,
            [targetMode]: [
              ...prev[targetMode],
              {
                id: createClientMessageId(),
                role: 'assistant',
                content: t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.')
              }
            ]
          }))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = () => {
    void handleSendMessageFromText(input, agentMode)
  }

  const activateAgentMode = (mode: AgentMode) => {
    setAgentMode(mode)

    // Para "Pesquisar impacto", o envio deve acontecer apenas após o usuário digitar o sintoma.
    if (mode === 'chat') {
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 120)
      }
      return
    }

    // Professor e Simulador autoenviam apenas na primeira ativação
    if (messagesByAgent[mode].length === 0) {
      void handleSendMessageFromText(AGENT_MODE_CONFIG[mode].greetingPrompt, mode)
    }
  }

  const modeCards: Array<{
    mode: AgentMode
    title: string
    description: string
    icon: typeof Search
  }> = [
    {
      mode: 'chat',
      title: t('chat.triage.card.chat.title', 'Pesquisar impacto emocional de um sintoma'),
      description: t(
        'chat.triage.card.chat.description',
        'Leitura terapêutica estruturada a partir do que você está investigando'
      ),
      icon: Search
    },
    {
      mode: 'professor',
      title: t('chat.triage.card.professor.title', 'Conversar com o Professor'),
      description: t(
        'chat.triage.card.professor.description',
        'Tire dúvidas sobre casos, protocolos e conduta clínica'
      ),
      icon: GraduationCap
    },
    {
      mode: 'simulador',
      title: t('chat.triage.card.simulator.title', 'Simular um atendimento'),
      description: t(
        'chat.triage.card.simulator.description',
        'Pratique uma consulta completa com um paciente virtual'
      ),
      icon: Headset
    }
  ]
  
  // Função para lidar com clique no botão de assinatura
  const handleSubscribe = () => {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  const handleGoHome = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ChatPage] Clique em Início, navegando para "/"')
    }
    router.push('/')
  }

  // Loading enquanto checa o perfil
  if (checkingProfile || !user) {
    return (
      <div className="flex flex-col justify-center items-center min-w-screen min-h-screen p-8 gap-8 bg-gradient-to-br from-indigo-600 to-purple-600">
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
        selectedThread={agentThreads.chat}
        onSelectSession={(threadId) => {
          setAgentMode('chat')
          setAgentThreads((prev) => ({ ...prev, chat: threadId }))
        }}
        onSelectSymptom={(symptomText) => {
          setAgentMode('chat')
          setChatResponses([])
          void handleSendMessageFromText(symptomText)
        }}
      />

      <SidebarInset>
        <div className="chat-app-shell">
          {/* Header */}
          <header className="chat-topbar">
            <div className="chat-main-container flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <SidebarTrigger className="-ml-1 flex-shrink-0" />
                <div className="flex flex-row items-center min-w-0">
                  <Avatar className="w-7 h-7 border-2 border-indigo-600 flex-shrink-0">
                    <AvatarImage
                      src={userContext?.image ?? undefined}
                      alt="User"
                    />
                    <AvatarFallback>
                      {FirstName(user.name).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="ml-2 text-xs sm:text-sm font-semibold text-indigo-700 truncate">
                    {t('chat.greeting.prefix', 'Olá')}, {FirstName(user.name)}!
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleGoHome}
                  className="h-7 sm:h-8 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-2 sm:px-2.5"
                  aria-label={t('chat.goHome', 'Ir para a página inicial')}
                  title={t('chat.goHome', 'Ir para a página inicial')}
                >
                  <Home className="w-3.5 h-3.5 mr-1" />
                  <span className="text-[11px] sm:text-xs">{t('sidebar.home', 'Início')}</span>
                </Button>
                <div className="relative group cursor-pointer" onClick={() => router.push('/suggestion')}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push('/suggestion')
                    }}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5 group-hover:scale-105 rounded-xl h-8 sm:h-9 px-2.5 sm:px-3"
                    size="default"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{t('sidebar.suggestion.button', 'Sugestão')}</span>
                  </Button>
                  <Badge 
                    className="absolute -top-2 -left-2 bg-green-500 hover:bg-green-600 text-white border-none shadow-lg animate-pulse cursor-pointer z-10"
                  >
                    <span className="relative z-10">{t('badge.new.lowercase', 'Novo')}</span>
                    <span className="absolute inset-0 bg-green-400 rounded-md animate-ping opacity-75"></span>
                  </Badge>
                </div>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 mr-1 sm:mr-2" />
              </div>
            </div>
          </header>

          {/* Links externos se houver resposta */}
          {agentMode === 'chat' && chatResponses.length > 0 && (
            <section className="chat-main-container pb-3 sm:pb-4">
              <ExternalLinks />
            </section>
          )}

          {/* Corpo da conversa */}
          <main className="flex-1 overflow-y-auto pb-8 min-h-[68vh]">
            <div className="chat-main-container pt-2 sm:pt-3">
              <p className="text-indigo-600 font-bold text-2xl sm:text-3xl leading-tight">
                me<span className="uppercase">diz</span>
                <span className="text-yellow-400">!</span>
              </p>
            </div>

            {agentMode === 'chat' && chatResponses.length === 0 && messagesByAgent.chat.length === 0 ? (
              <div className="chat-main-container mt-1.5 sm:mt-2 flex flex-col gap-2.5 sm:gap-3">
                <div className="chat-card p-2.5 sm:p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                      m
                    </div>
                    <div className="chat-bubble-assistant !max-w-[100%]">
                      <p className="text-sm sm:text-base font-semibold text-indigo-700 mb-0.5">
                        {t('chat.personalized.hello', `Olá, ${FirstName(user.name)}! 👋`)}
                      </p>
                      <p className="text-xs sm:text-sm leading-relaxed">
                        {t(
                          'chat.proactive.greeting',
                          `Me conta: o que você gostaria de fazer hoje? Posso te ajudar de três formas diferentes, ou você pode descrever livremente no campo abaixo.`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2">
                    {modeCards.map((card) => {
                      const CardIcon = card.icon
                      const isActive = agentMode === card.mode
                      return (
                        <button
                          key={card.mode}
                          type="button"
                          onClick={() => activateAgentMode(card.mode)}
                          className={`w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${
                            isActive
                              ? 'border-indigo-400 bg-indigo-50'
                              : 'border-indigo-200 bg-white/90 hover:bg-indigo-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                              <CardIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm sm:text-base font-semibold text-indigo-950 leading-tight">{card.title}</p>
                              <p className="text-[11px] sm:text-xs text-indigo-900/70 leading-snug mt-0.5">
                                {card.description}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {loading && (
                    <div className="mt-2 flex justify-start">
                      <div className="chat-bubble-assistant text-zinc-500 text-xs py-2">
                        {t('chat.typing.assistant', 'Produzindo seu relatório emocional...')}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : agentMode === 'chat' ? (
              <div className="chat-main-container space-y-4">
                {chatResponses.map((md, idx) => (
                  <Result 
                    key={idx} 
                    markdown={md} 
                    elapsedMs={elapsedMs ?? 0} 
                    userPeriod={userPeriod}
                    fullVisualization={fullVisualization}
                    onSubscribe={handleSubscribe}
                    userQuestion={originalQuestion}
                    sessionId={agentThreads.chat || undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="chat-main-container space-y-3 sm:space-y-4">
                {messagesByAgent[agentMode].map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="chat-bubble-assistant text-zinc-500 text-xs py-2">
                      {t('chat.typing.assistant', 'Produzindo seu relatório emocional...')}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Pop-up entre pesquisas */}
            <PromotionPopup
              open={showPopup}
              onOpenChange={setShowPopup}
              onSubscribe={handleSubscribe}
            />
          </main>

          <div className="chat-main-container pt-1.5 pb-3">
            <div className="chat-card p-2 sm:p-2.5">
              <p className="text-center text-indigo-700/75 text-[11px] sm:text-xs mb-1.5">
                {t(
                  'chat.composer.hint',
                  'Pesquisar impacto: digite seu sintoma. Professor e Simulador iniciam automaticamente.'
                )}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500/70" />
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t(
                    'chat.composer.placeholder',
                    'Pode ser um sintoma, uma dúvida para o Professor ou exercitar um atendimento...'
                  )}
                  className="h-11 rounded-[14px] border-2 border-indigo-500/70 bg-white/95 pl-9 pr-24 text-xs sm:text-sm placeholder:text-indigo-700/60"
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold"
                >
                  {t('chat.send', 'Enviar')}
                </Button>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
