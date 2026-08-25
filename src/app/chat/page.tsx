// src/app/chat/page.tsx
'use client'

/// <reference lib="dom" />

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { AgentPromptTestPanel } from '@/components/chat/AgentPromptTestPanel'
import { ChatAppHeader } from '@/components/chat/ChatAppHeader'
import {
  ChatConversation,
  type ChatMessage
} from '@/components/chat/ChatConversation'
import { ChatHomeExperience } from '@/components/chat/ChatHomeExperience'
import type { AgentId } from '@/components/chat/ChatHomeExperience'
import { Footer } from '@/components/Footer'
import PromotionPopup from '@/components/PromotionPopup'
import Spinner from '@/components/Spinner'
import { DiscoveryInvite } from '@/components/discovery/DiscoveryInvite'
import {
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { FirstName } from '@/lib/utils'
import {
  type ConciergeEntryPoint,
  getAgentWelcomeMessage,
  isMedizAgent
} from '@/lib/conversational-chat/config'
import { getUpgradeLink } from '@/lib/upgradeLinks'
import { User } from '@/types/User'

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
  const searchParams = useSearchParams()
  const { t, language } = useTranslation()

  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [revealingMessages, setRevealingMessages] = useState(false)
  // Só o lote que o agente acabou de enviar anima na entrada. A bolha do usuário
  // remonta quando o id otimista (`temp-…`) é trocado pelo id real do servidor —
  // sem esse recorte ela reanimaria a cada resposta.
  const [animateIds, setAnimateIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('concierge')
  const [conciergeEntryPoint, setConciergeEntryPoint] =
    useState<ConciergeEntryPoint>('free')
  const [chatError, setChatError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [promptTestMode, setPromptTestMode] = useState(false)
  const [suggestDiscovery, setSuggestDiscovery] = useState(false)
  const revealTimersRef = useRef<number[]>([])
  const skipNextThreadLoadRef = useRef(false)
  const handledSidebarStartRef = useRef<string | null>(null)

  const clearRevealTimers = () => {
    revealTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    revealTimersRef.current = []
    setRevealingMessages(false)
  }

  useEffect(() => {
    return () => {
      revealTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])
  
  // Estados relacionados às regras de uso do plano gratuito
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

        // O formulario de perfil deixou de barrar a entrada: nenhum dos campos que
        // ele coleta (age, gender, profession, appUsage, description) alimenta o
        // chat — so o proprio bloqueio os lia. `/form` segue de pe para quem
        // quiser preencher; para religar a obrigatoriedade, basta voltar o
        // redirect que ficava aqui e no `catch` la embaixo.

        // Descoberta: nas duas primeiras aparicoes e um convite dispensavel aqui na
        // tela (ver DiscoveryInvite). Na terceira ela deixa de ser opcional, e so
        // entao volta a redirecionar. Nunca na primeira visita.
        try {
          const discoveryRes = await fetch('/api/discovery/status')
          if (discoveryRes.ok) {
            const discoveryData = await discoveryRes.json()
            if (discoveryData.requiresDiscovery) {
              router.replace('/descoberta')
              return
            }
            if (!cancelled) {
              setSuggestDiscovery(Boolean(discoveryData.suggestDiscovery))
            }
          }
        } catch {
          // Falha ao consultar descoberta nao deve bloquear o acesso ao chat.
        }

        // Tutorial do 2.0: vem depois da descoberta de proposito — quem cai nos
        // dois faz a conversa primeiro e, ao voltar dela para o /chat, encontra
        // este gate. Toda a base passa por ele uma vez.
        try {
          const tutorialRes = await fetch('/api/tutorial/status')
          if (tutorialRes.ok) {
            const tutorialData = await tutorialRes.json()
            if (tutorialData.requiresTutorial) {
              router.replace('/tutorial')
              return
            }
          }
        } catch {
          // Mesma regra da descoberta: falha de consulta nao prende ninguem.
        }

        try {
          const promptTestModeRes = await fetch('/api/conversational-chat/dev/prompt')
          if (promptTestModeRes.ok) {
            const data = await promptTestModeRes.json()
            if (!cancelled) setPromptTestMode(Boolean(data.testMode))
          }
        } catch {
          // Painel de teste e so um recurso de HML; falha aqui nao deve bloquear o chat.
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
        // Sem conseguir carregar o usuario nao da para saber nem quem esta logado —
        // segue a mesma saida do `!res.ok` acima. Mandar para `/form` era atalho de
        // quando perfil incompleto barrava a entrada.
        router.replace('/login')
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
    if (skipNextThreadLoadRef.current) {
      skipNextThreadLoadRef.current = false
      return
    }
    let cancelled = false
    clearRevealTimers()
    setLoading(true)

    // Timeout de 60 segundos para carregamento de mensagens
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
    
    fetch(`/api/conversational-chat?threadId=${selectedThread}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar conversa')
        }
        return data
      })
      .then(data => {
        if (!cancelled) {
          // Histórico entra montado, sem animação de chegada.
          setAnimateIds(new Set())
          setMessages(data.messages || [])
          setSelectedAgent(isMedizAgent(data.agent) ? data.agent : 'body')
        }
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
    if (!input.trim() || loading || revealingMessages) return // Evita múltiplas chamadas
    handleSendMessageFromText(input.trim())
  }

  // Função reutilizável para enviar mensagem
  const handleSendMessageFromText = async (
    text: string,
    threadOverride: string | null = selectedThread,
    agentOverride: AgentId = selectedAgent
  ) => {
    if (loading || revealingMessages) return
    const trimmedText = text.trim()
    if (!trimmedText) return

    setLoading(true)
    setChatError(null)
    setInput('')

    const optimisticId = `temp-${Date.now()}`
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        role: 'USER',
        content: trimmedText,
        createdAt: new Date().toISOString()
      }
    ])

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)
      const res = await fetch('/api/conversational-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmedText,
          language,
          threadId: threadOverride ?? undefined,
          chatKind: 'SEARCH',
          agent: agentOverride,
          conciergeEntryPoint:
            agentOverride === 'concierge' ? conciergeEntryPoint : undefined
        })
      }).finally(() => clearTimeout(timeoutId))

      if (res.status === 401) {
        router.replace('/login')
        return
      }

      const data = await res.json()
      if (res.status === 403 && data.limitReached) {
        setLimitReached(true)
        return
      }
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem')
      }

      if (isMedizAgent(data.agent)) {
        setSelectedAgent(data.agent)
      }

      if (data.threadId && data.threadId !== selectedThread) {
        skipNextThreadLoadRef.current = true
        setSelectedThread(data.threadId)
      }
      if (!Array.isArray(data.messages)) {
        throw new Error('Resposta inválida do servidor')
      }
      const newMessages: ChatMessage[] = Array.isArray(data.newMessages)
        ? data.newMessages
        : []
      const shouldReduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      setAnimateIds(new Set(newMessages.map((message) => message.id)))

      if (newMessages.length <= 1 || shouldReduceMotion) {
        const extrasById = new Map(
          newMessages
            .filter((message) => message.action || message.transition)
            .map((message) => [
              message.id,
              { action: message.action, transition: message.transition }
            ])
        )
        setMessages(
          extrasById.size > 0
            ? data.messages.map((message: ChatMessage) =>
                extrasById.has(message.id)
                  ? { ...message, ...extrasById.get(message.id) }
                  : message
              )
            : data.messages
        )
      } else {
        const newIds = new Set(newMessages.map((message) => message.id))
        setMessages(
          data.messages.filter((message: ChatMessage) => !newIds.has(message.id))
        )
        setRevealingMessages(true)

        // Delay acumulado em vez de fixo: uma pausa maior bem antes da
        // mensagem que carrega `transition` reforça, junto com o divisor
        // visual em ChatConversation, que houve uma troca de agente — não
        // é só mais uma bolha aparecendo em sequência.
        let cumulativeDelay = 0
        newMessages.forEach((message, index) => {
          // Pausa proporcional ao tamanho do que vai aparecer, pro "Digitando…"
          // durar o suficiente pra ser lido como digitação e não como um piscar.
          // Teto baixo pra não atrasar a leitura.
          cumulativeDelay += message.transition
            ? 900
            : Math.min(900, 320 + Math.round((message.content?.length ?? 0) * 7))
          const timer = window.setTimeout(() => {
            setMessages((current) => [...current, message])
            if (index === newMessages.length - 1) {
              revealTimersRef.current = []
              setRevealingMessages(false)
            }
          }, cumulativeDelay)
          revealTimersRef.current.push(timer)
        })
      }

      if (data.shouldShowPopup) {
        setTimeout(() => setShowPopup(true), 2000)
      }
      if (typeof data.redirectTo === 'string' && data.redirectTo.startsWith('/')) {
        window.setTimeout(() => router.push(data.redirectTo), 650)
      }
    } catch (err) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId)
      )
      setInput(trimmedText)
      setChatError(
        err instanceof Error
          ? err.message
          : t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = () => {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  const startNewConversation = () => {
    clearRevealTimers()
    setSelectedThread(null)
    setSelectedAgent('concierge')
    setConciergeEntryPoint('free')
    setMessages([])
    setInput('')
    setChatError(null)
  }

  const startConversationFromHome = (
    agent: AgentId,
    welcomeMessage: string,
    entryPoint: ConciergeEntryPoint = 'free'
  ) => {
    if (loading || revealingMessages) return
    clearRevealTimers()
    setSelectedAgent(agent)
    setConciergeEntryPoint(agent === 'concierge' ? entryPoint : 'free')
    setSelectedThread(null)
    setMessages([
      {
        id: `welcome-${agent}`,
        role: 'ASSISTANT',
        content: welcomeMessage,
        createdAt: new Date().toISOString()
      }
    ])
    setInput('')
    setChatError(null)
  }

  const getAgentStarter = useCallback(
    (agent: AgentId) => {
      return t(`chat.agent.${agent}.welcome`, getAgentWelcomeMessage(agent))
    },
    [t]
  )

  useEffect(() => {
    if (checkingProfile || loading || revealingMessages) return
    const requestedThread = searchParams.get('threadId')?.trim()
    if (requestedThread) {
      const requestKey = `thread:${requestedThread}`
      if (handledSidebarStartRef.current === requestKey) return
      handledSidebarStartRef.current = requestKey
      router.replace('/chat', { scroll: false })
      setSelectedThread(requestedThread)
      return
    }

    const requestedAgent = searchParams.get('start')
    if (!isMedizAgent(requestedAgent)) return

    const requestKey = `${requestedAgent}:${searchParams.toString()}`
    if (handledSidebarStartRef.current === requestKey) return
    handledSidebarStartRef.current = requestKey

    router.replace('/chat', { scroll: false })
    startConversationFromHome(
      requestedAgent,
      getAgentStarter(requestedAgent)
    )
  }, [
    checkingProfile,
    getAgentStarter,
    loading,
    revealingMessages,
    router,
    searchParams
  ])

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
    <SidebarProvider className="relative isolate h-svh overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      <AppSidebar
        history={[]}
        selectedThread={selectedThread}
        onSelectSession={setSelectedThread}
        onNewChat={startNewConversation}
        onStartAgentChat={(agent) =>
          startConversationFromHome(agent, getAgentStarter(agent))
        }
        onSelectSymptom={(symptomText) => {
          setInput(symptomText)
          setMessages([])
          setSelectedThread(null)
          handleSendMessageFromText(symptomText, null)
        }}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden !bg-transparent">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-foreground">
          <ChatAppHeader onSuggestion={() => router.push('/suggestion')} />

          <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent">
            {/* So na home do chat: no meio de uma conversa o convite seria interrupcao. */}
            {suggestDiscovery && messages.length === 0 && !loading ? (
              <div className="mx-auto w-full max-w-2xl shrink-0 px-4 pt-3">
                <DiscoveryInvite onDismissed={() => setSuggestDiscovery(false)} />
              </div>
            ) : null}

            {messages.length === 0 && !loading ? (
              <ChatHomeExperience
                userName={FirstName(user.name)}
                input={input}
                loading={loading || revealingMessages}
                onInputChange={setInput}
                onSubmit={handleSendMessage}
                onSubmitText={handleSendMessageFromText}
                onStartConversation={startConversationFromHome}
                onOpenResearch={() => router.push('/pesquisa')}
              />
            ) : (
              <ChatConversation
                agent={selectedAgent}
                messages={messages}
                animateIds={animateIds}
                input={input}
                loading={loading || revealingMessages}
                showThinking={loading || revealingMessages}
                thinkingLabel={
                  revealingMessages && !loading
                    ? t('chat.typing', 'Digitando…')
                    : t('chat.thinking', 'Pensando…')
                }
                error={chatError}
                onInputChange={setInput}
                onSubmit={handleSendMessage}
                onSubmitText={handleSendMessageFromText}
                onNewConversation={startNewConversation}
              />
            )}

            {/* Pop-up entre pesquisas */}
            <PromotionPopup
              open={showPopup}
              onOpenChange={setShowPopup}
              onSubscribe={handleSubscribe}
            />
          </main>

          {promptTestMode ? (
            <AgentPromptTestPanel
              defaultAgent={selectedAgent}
              onNewConversation={startNewConversation}
            />
          ) : null}

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
