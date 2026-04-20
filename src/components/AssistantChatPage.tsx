'use client'

import { Footer } from '@/components/Footer'
import Spinner from '@/components/Spinner'
import { AppSidebar } from '@/components/app-sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { useTranslation } from '@/i18n/useTranslation'
import { AssistantHandoffPayload } from '@/lib/chatHandoff'
import { FirstName } from '@/lib/utils'
import { Bell, Home, SendHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type RawUser = {
  image: string
  name?: string
  fullName?: string
  email?: string
}

type ChatBubble = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const createClientMessageId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

type AssistantChatPageProps = {
  assistantName: string
  assistantSubtitle: string
  apiEndpoint: string
  welcomeTitle: string
  welcomeDescription: string
  inputPlaceholder: string
  typingLabel: string
  sendLabel: string
  handoffStorageKey?: string
}

export function AssistantChatPage({
  assistantName,
  assistantSubtitle,
  apiEndpoint,
  welcomeTitle,
  welcomeDescription,
  inputPlaceholder,
  typingLabel,
  sendLabel,
  handoffStorageKey
}: AssistantChatPageProps) {
  const router = useRouter()
  const { user: userContext } = useUser()
  const { t, language } = useTranslation()

  const [checkingProfile, setCheckingProfile] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const handoffConsumedRef = useRef(false)

  const greetingName = useMemo(
    () => FirstName(displayName || userContext?.name || ''),
    [displayName, userContext?.name]
  )

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      try {
        const res = await fetch('/api/user')
        if (!res.ok) {
          router.replace('/login')
          return
        }

        const raw: RawUser = await res.json()
        const name = raw.fullName ?? raw.name ?? ''

        if (!cancelled) {
          setDisplayName(name)
          setCheckingProfile(false)
        }
      } catch {
        router.replace('/login')
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const appendMessages = (newMessages: ChatBubble[]) => {
    setMessages((prev) => [...prev, ...newMessages])
  }

  const handleGoHome = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AssistantChatPage] Clique em Início, navegando para "/"')
    }
    router.push('/')
  }

  const sendMessage = useCallback(async (text: string, displayOverride?: string) => {
    const messageText = text.trim()
    if (!messageText || loading) return

    appendMessages([
      {
        id: createClientMessageId(),
        role: 'user',
        content: displayOverride || messageText
      }
    ])

    setInput('')
    setLoading(true)

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: messageText, language, threadId })
      })

      if (res.status === 401) {
        router.replace('/login')
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const errorMessage =
          errorData?.error || t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.')
        appendMessages([
          {
            id: createClientMessageId(),
            role: 'assistant',
            content: errorMessage
          }
        ])
        return
      }

      const data = await res.json()
      if (typeof data?.threadId === 'string' && data.threadId) {
        setThreadId(data.threadId)
      }

      const latestAssistantReply =
        typeof data?.latestAssistantReply === 'string' && data.latestAssistantReply.trim().length > 0
          ? data.latestAssistantReply
          : null

      const assistantReplies: string[] = latestAssistantReply
        ? [latestAssistantReply]
        : Array.isArray(data?.responses?.assistant)
          ? data.responses.assistant.length > 0
            ? [String(data.responses.assistant[data.responses.assistant.length - 1])]
            : []
          : data?.responses?.assistant
            ? [String(data.responses.assistant)]
            : []

      if (assistantReplies.length === 0) {
        appendMessages([
          {
            id: createClientMessageId(),
            role: 'assistant',
            content: t('chat.error.empty', 'Não consegui gerar uma resposta agora. Tente novamente.')
          }
        ])
        return
      }

      appendMessages(
        assistantReplies.map((reply) => ({
          id: createClientMessageId(),
          role: 'assistant' as const,
          content: reply
        }))
      )
    } catch {
      appendMessages([
        {
          id: createClientMessageId(),
          role: 'assistant',
          content: t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.')
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, language, loading, router, t, threadId])

  useEffect(() => {
    if (checkingProfile || handoffConsumedRef.current || !handoffStorageKey) return
    if (typeof window === 'undefined') return

    const rawPayload = sessionStorage.getItem(handoffStorageKey)
    if (!rawPayload) return

    handoffConsumedRef.current = true
    sessionStorage.removeItem(handoffStorageKey)

    try {
      const payload = JSON.parse(rawPayload) as AssistantHandoffPayload
      if (!payload.message || !payload.message.trim()) return

      sendMessage(
        payload.message,
        payload.preview ||
          t('chat.handoff.preview', `Contexto encaminhado da pesquisa: ${payload.sourceQuestion}`)
      )
    } catch (error) {
      console.error('[AssistantChatPage] Erro ao consumir handoff:', error)
    }
  }, [checkingProfile, handoffStorageKey, sendMessage, t])

  if (checkingProfile) {
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
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={() => undefined}
        onSelectSymptom={(symptomText) => {
          sendMessage(symptomText)
        }}
      />

      <SidebarInset>
        <div className="chat-app-shell">
          <header className="chat-topbar">
            <div className="chat-main-container flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <SidebarTrigger className="-ml-1 flex-shrink-0" />
                <Avatar className="w-8 h-8 border-2 border-indigo-600 flex-shrink-0">
                  <AvatarImage src={userContext?.image ?? undefined} alt="User" />
                  <AvatarFallback>{greetingName.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-indigo-700 truncate">
                    {assistantName}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-zinc-500 truncate">{assistantSubtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={handleGoHome}
                  className="h-8 sm:h-9 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-2.5 sm:px-3"
                  aria-label={t('chat.goHome', 'Ir para a página inicial')}
                  title={t('chat.goHome', 'Ir para a página inicial')}
                >
                  <Home className="w-4 h-4 mr-1.5" />
                  <span className="text-xs sm:text-sm">{t('sidebar.home', 'Início')}</span>
                </Button>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 mr-1 sm:mr-2" />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto py-4 sm:py-6">
            <div className="chat-main-container space-y-4 sm:space-y-5">
              {messages.length === 0 && (
                <div className="chat-card p-4 sm:p-6 text-zinc-600">
                  <p className="font-semibold text-zinc-800 mb-1">{welcomeTitle}</p>
                  <p className="text-sm sm:text-[15px] leading-relaxed">{welcomeDescription}</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed shadow-sm ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white text-zinc-800 border border-zinc-200 rounded-bl-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[82%] rounded-2xl rounded-bl-sm px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white border border-zinc-200 text-sm text-zinc-500 shadow-sm">
                    {typingLabel}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <div className="chat-composer-bar">
            <div className="chat-main-container flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder={inputPlaceholder}
                className="h-11 sm:h-12 bg-white rounded-xl border-zinc-300 focus-visible:ring-indigo-500 focus-visible:ring-2 text-sm sm:text-base"
                disabled={loading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <SendHorizontal className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{sendLabel}</span>
              </Button>
            </div>
          </div>

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
