// src/app/chat/page.tsx
'use client'

/// <reference lib="dom" />

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AppSidebar,
  type SessionHistoryItem
} from '@/components/app-sidebar'
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
import {
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { FirstName } from '@/lib/utils'
import { isMedizAgent } from '@/lib/conversational-chat/config'
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
  const { t, language } = useTranslation()

  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [revealingMessages, setRevealingMessages] = useState(false)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('body')
  const [history, setHistory] = useState<SessionHistoryItem[]>([])
  const [chatError, setChatError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const revealTimersRef = useRef<number[]>([])
  const skipNextThreadLoadRef = useRef(false)

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

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/conversational-chat/sessions?chatKind=SEARCH'
      )
      if (response.status === 403) {
        setHistory([])
        return
      }
      if (!response.ok) return

      const data = await response.json()
      setHistory(Array.isArray(data.sessions) ? data.sessions : [])
    } catch (error) {
      console.error('[chat-history] Falha ao carregar histórico', error)
    }
  }, [])

  useEffect(() => {
    if (!checkingProfile) void loadHistory()
  }, [checkingProfile, loadHistory])

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
    threadOverride: string | null = selectedThread
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
          agent: selectedAgent
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

      if (newMessages.length <= 1 || shouldReduceMotion) {
        setMessages(data.messages)
      } else {
        const newIds = new Set(newMessages.map((message) => message.id))
        setMessages(
          data.messages.filter((message: ChatMessage) => !newIds.has(message.id))
        )
        setRevealingMessages(true)

        newMessages.forEach((message, index) => {
          const timer = window.setTimeout(() => {
            setMessages((current) => [...current, message])
            if (index === newMessages.length - 1) {
              revealTimersRef.current = []
              setRevealingMessages(false)
            }
          }, 280 * (index + 1))
          revealTimersRef.current.push(timer)
        })
      }

      if (data.shouldShowPopup) {
        setTimeout(() => setShowPopup(true), 2000)
      }
      void loadHistory()
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
    setMessages([])
    setInput('')
    setChatError(null)
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
    <SidebarProvider className="relative isolate overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      <AppSidebar
        history={history}
        selectedThread={selectedThread}
        onSelectSession={(threadId) => {
          const target = history.find((item) => item.threadId === threadId)
          setSelectedAgent(
            target && isMedizAgent(target.agent) ? target.agent : 'body'
          )
          setSelectedThread(threadId)
        }}
        onSelectSymptom={(symptomText) => {
          setInput(symptomText)
          setMessages([])
          setSelectedThread(null)
          handleSendMessageFromText(symptomText, null)
        }}
      />

      <SidebarInset className="min-w-0 overflow-x-hidden !bg-transparent">
        <div className="flex min-h-svh flex-col bg-transparent text-foreground">
          <ChatAppHeader onSuggestion={() => router.push('/suggestion')} />

          <main className="flex w-full flex-1 flex-col overflow-x-hidden bg-transparent">
            {messages.length === 0 && !loading ? (
              <ChatHomeExperience
                userName={FirstName(user.name)}
                input={input}
                loading={loading || revealingMessages}
                selectedAgent={selectedAgent}
                onInputChange={setInput}
                onAgentChange={setSelectedAgent}
                onSubmit={handleSendMessage}
              />
            ) : (
              <ChatConversation
                agent={selectedAgent}
                messages={messages}
                input={input}
                loading={loading || revealingMessages}
                showThinking={loading}
                error={chatError}
                onInputChange={setInput}
                onSubmit={handleSendMessage}
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

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
