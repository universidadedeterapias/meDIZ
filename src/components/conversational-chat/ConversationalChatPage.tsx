'use client'

import {
  Bell,
  History,
  Lock,
  MessageSquarePlus,
  Send,
  Sparkles
} from 'lucide-react'
import { format } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

import { AppSidebar } from '@/components/app-sidebar'
import {
  MedizChatV2HeaderGlow,
  MedizChatV2Logo,
  MedizChatV2Shell
} from '@/components/conversational-chat/MedizChatV2Shell'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { useLanguage } from '@/i18n/useLanguage'
import type { ConversationalChatKind } from '@/lib/conversational-chat/config'
import type { SimulatorMode } from '@/lib/conversational-chat/simulator-modes'
import { FirstName } from '@/lib/utils'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

type SessionItem = {
  id: string
  threadId: string
  createdAt: string
  firstUserMessage: string
}

type ConversationalChatPageProps = {
  chatKind: ConversationalChatKind
  title: string
  subtitle: string
  emptyHint: string
  /** Nova conversa sem carregar o último histórico */
  startFresh?: boolean
  /** Mensagem enviada automaticamente ao abrir (ex.: escolha do simulador) */
  initialMessage?: string
  simulatorMode?: SimulatorMode
  /** Link para voltar à tela de escolha de modo */
  modePickerHref?: string
}

export function ConversationalChatPage({
  chatKind,
  title,
  subtitle,
  emptyHint,
  startFresh = false,
  initialMessage,
  simulatorMode,
  modePickerHref
}: ConversationalChatPageProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const { user: userContext } = useUser()
  const { isPremium, isLoading: isLoadingPremium } = useSubscriptionStatus()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoStartedRef = useRef(false)

  const userName = userContext?.name
    ? FirstName(userContext.name)
    : userContext?.fullName
      ? FirstName(userContext.fullName)
      : ''

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadSessions = useCallback(async () => {
    const res = await fetch(
      `/api/conversational-chat/sessions?chatKind=${chatKind}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { sessions?: SessionItem[] }
    return data.sessions ?? []
  }, [chatKind])

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(
      `/api/conversational-chat?threadId=${encodeURIComponent(id)}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error('Não foi possível carregar a conversa')
    const data = (await res.json()) as { messages?: ChatMessage[] }
    return data.messages ?? []
  }, [])

  const openUpgradeForFreeUser = useCallback(() => {
    if (!isPremium && !isLoadingPremium) {
      setShowUpgrade(true)
      return true
    }
    return false
  }, [isPremium, isLoadingPremium])

  useEffect(() => {
    if (isLoadingPremium) return
    if (!isPremium) {
      setLoadingHistory(false)
      setShowUpgrade(true)
      return
    }

    if (startFresh) {
      setLoadingHistory(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const list = await loadSessions()
        if (cancelled) return
        setSessions(list)
        if (list.length > 0) {
          const latest = list[0]
          setThreadId(latest.threadId)
          const msgs = await loadThread(latest.threadId)
          if (!cancelled) setMessages(msgs)
        }
      } catch {
        if (!cancelled) setError('Erro ao carregar histórico')
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoadingPremium, isPremium, loadSessions, loadThread, startFresh])

  const sendMessageWithText = useCallback(
    async (rawText: string) => {
      if (openUpgradeForFreeUser()) return

      const text = rawText.trim()
      if (!text || loading) return

      setLoading(true)
      setError(null)
      setInput('')

      const optimisticId = `temp-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          role: 'USER',
          content: text,
          createdAt: new Date().toISOString()
        }
      ])

      try {
        const res = await fetch('/api/conversational-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            threadId: threadId ?? undefined,
            chatKind,
            language,
            ...(simulatorMode ? { simulatorMode } : {})
          })
        })

        const rawBody = await res.text()
        let data: {
          error?: string
          details?: string
          threadId?: string
          messages?: ChatMessage[]
        } = {}

        if (rawBody.trim()) {
          try {
            data = JSON.parse(rawBody) as typeof data
          } catch {
            throw new Error('Resposta inválida do servidor. Tente novamente.')
          }
        } else if (!res.ok) {
          throw new Error('Erro ao enviar mensagem. Tente novamente.')
        }

        if (!res.ok) {
          if (res.status === 403) {
            setShowUpgrade(true)
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
            setInput(text)
            return
          }
          if (data.details) {
            console.error('[conversational-chat]', data.details)
          }
          throw new Error(data.error || 'Erro ao enviar mensagem')
        }

        setThreadId(data.threadId ?? null)
        setMessages(data.messages ?? [])

        const list = await loadSessions()
        setSessions(list)
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setInput(text)
        setError(err instanceof Error ? err.message : 'Erro ao enviar')
      } finally {
        setLoading(false)
      }
    },
    [
      chatKind,
      language,
      loadSessions,
      loading,
      openUpgradeForFreeUser,
      simulatorMode,
      threadId
    ]
  )

  useEffect(() => {
    if (
      !initialMessage ||
      autoStartedRef.current ||
      isLoadingPremium ||
      !isPremium ||
      loadingHistory
    ) {
      return
    }
    autoStartedRef.current = true
    void sendMessageWithText(initialMessage)
  }, [
    initialMessage,
    isLoadingPremium,
    isPremium,
    loadingHistory,
    sendMessageWithText
  ])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  const startNewConversation = () => {
    if (openUpgradeForFreeUser()) return
    if (modePickerHref) {
      router.push(modePickerHref)
      return
    }
    setThreadId(null)
    setMessages([])
    setError(null)
    setInput('')
    setHistoryOpen(false)
    textareaRef.current?.focus()
  }

  const selectSession = async (id: string) => {
    if (openUpgradeForFreeUser()) return
    if (id === threadId) {
      setHistoryOpen(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const msgs = await loadThread(id)
      setThreadId(id)
      setMessages(msgs)
      setHistoryOpen(false)
    } catch {
      setError('Erro ao abrir conversa')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    await sendMessageWithText(input)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar history={[]} selectedThread={null} onSelectSession={() => {}} />
      <SidebarInset className="flex min-h-svh min-w-0 flex-col overflow-x-hidden p-0">
        <MedizChatV2Shell className="min-h-svh">
          <MedizChatV2HeaderGlow />

          <header className="sticky top-0 z-20 shrink-0 border-b border-violet-200/40 bg-[#f3ecfa]/90 px-2 pb-2 pt-2 backdrop-blur-md dark:border-violet-800/40 dark:bg-[#0f0a18]/90 sm:px-4">
            <div className="relative flex min-h-9 items-center justify-between">
              <SidebarTrigger className="relative z-10 -ml-0.5 text-[#6d28d9] hover:bg-[#ede9fe] dark:text-violet-300 dark:hover:bg-violet-950/60" />

              <div className="pointer-events-none absolute inset-x-10 flex justify-center sm:inset-x-14">
                <MedizChatV2Logo />
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-0.5 sm:gap-1">
                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[#7c3aed] hover:bg-[#ede9fe] dark:text-violet-300 dark:hover:bg-violet-950/60"
                    title="Histórico"
                    onClick={() => {
                      if (openUpgradeForFreeUser()) return
                      setHistoryOpen(true)
                    }}
                  >
                    <History className="size-4" />
                  </Button>
                  <SheetContent side="right" className="w-[min(100vw,320px)]">
                    <SheetHeader>
                      <SheetTitle>Histórico — {title}</SheetTitle>
                    </SheetHeader>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 w-full justify-start gap-2"
                      onClick={startNewConversation}
                    >
                      <MessageSquarePlus className="size-4" />
                      Nova conversa
                    </Button>
                    <div className="mt-4 max-h-[70vh] space-y-1 overflow-y-auto">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => void selectSession(session.threadId)}
                          className={cn(
                            'w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/50',
                            threadId === session.threadId &&
                              'bg-violet-100 font-medium text-[#5b21b6] dark:bg-violet-950/70 dark:text-violet-200'
                          )}
                        >
                          <span className="line-clamp-2">
                            {session.firstUserMessage || 'Conversa'}
                          </span>
                        </button>
                      ))}
                      {!loadingHistory && sessions.length === 0 ? (
                        <p className="text-sm text-[#7c5cad] dark:text-violet-400">
                          Nenhuma conversa ainda.
                        </p>
                      ) : null}
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="hidden sm:block [&_button]:border-[#c4b5fd] [&_button]:bg-[#ede9fe] [&_button]:text-[#5b21b6] dark:[&_button]:border-violet-700 dark:[&_button]:bg-violet-950/80 dark:[&_button]:text-violet-200">
                  <LanguageSwitcher showLabel={false} variant="header" />
                </div>
                <ThemeToggle variant="icon" className="h-8 w-8 sm:h-9 sm:w-9" />
                <button
                  type="button"
                  className="relative hidden p-2 text-[#7c3aed] dark:text-violet-300 sm:block"
                  aria-label="Notificações"
                >
                  <Bell className="size-5" />
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#f5c518]" />
                </button>
              </div>
            </div>

            <p className="mt-1.5 text-center text-[10px] text-[#7c5cad] dark:text-violet-400 sm:mt-2 sm:text-xs">
              {subtitle}
            </p>
            {modePickerHref ? (
              <p className="mt-1 text-center">
                <a
                  href={modePickerHref}
                  className="text-[10px] font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-300 sm:text-xs"
                >
                  Trocar modo de simulação
                </a>
              </p>
            ) : null}
          </header>

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {loadingHistory ? (
                <p className="text-center text-sm text-[#7c5cad] dark:text-violet-400">
                  Carregando...
                </p>
              ) : messages.length === 0 ? (
                <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-16 text-center">
                  <p className="text-base leading-relaxed text-[#5b21b6] dark:text-violet-200 sm:text-lg">
                    {userName ? (
                      <>
                        Oi, {userName}… {emptyHint}
                      </>
                    ) : (
                      emptyHint
                    )}
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-2xl flex-col gap-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2.5',
                        message.role === 'USER' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'ASSISTANT' ? (
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-lg shadow-sm ring-2 ring-white dark:bg-violet-900 dark:ring-violet-950">
                          <Sparkles className="size-4 text-[#7c3aed] dark:text-violet-300" />
                        </div>
                      ) : null}

                      <div
                        className={cn(
                          'relative max-w-[min(88%,26rem)] px-4 py-3 text-sm leading-relaxed shadow-sm',
                          message.role === 'USER'
                            ? 'rounded-2xl rounded-br-md bg-[#ddd6fe] text-[#4c1d95] dark:bg-violet-700 dark:text-violet-50'
                            : 'rounded-2xl rounded-bl-md border border-[#ede9fe] bg-white text-[#5b21b6] dark:border-violet-800 dark:bg-[#1a1028] dark:text-violet-100'
                        )}
                      >
                        {message.role === 'ASSISTANT' ? (
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-p:text-[#5b21b6] dark:prose-invert dark:prose-p:text-violet-100">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                        <span className="mt-1 block text-right text-[10px] text-[#a78bfa] dark:text-violet-400">
                          {format(new Date(message.createdAt), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-[#7c5cad] dark:text-violet-400">
                      <div className="size-9 rounded-full bg-[#ede9fe] dark:bg-violet-900/60" />
                      <span className="animate-pulse">Digitando...</span>
                    </div>
                  ) : null}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <footer className="shrink-0 px-3 pb-4 pt-2 sm:px-6 sm:pb-5">
              <div className="mx-auto flex max-w-2xl items-center gap-2">
                <div className="flex flex-1 items-center rounded-full border-2 border-[#a78bfa] bg-white/90 px-4 py-1 shadow-[0_4px_24px_rgba(124,58,237,0.12)] backdrop-blur-sm dark:border-violet-500 dark:bg-violet-950/50 dark:shadow-[0_4px_24px_rgba(124,58,237,0.2)]">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    rows={1}
                    disabled={loading}
                    onFocus={() => openUpgradeForFreeUser()}
                    className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-0 text-[#4c1d96] shadow-none placeholder:text-[#a78bfa] focus-visible:ring-0 dark:text-violet-100 dark:placeholder:text-violet-500"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void sendMessage()}
                  disabled={loading || !input.trim()}
                  className="size-12 shrink-0 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] shadow-lg shadow-violet-500/30 hover:from-[#7c3aed] hover:to-[#5b21b6]"
                  aria-label="Enviar"
                >
                  <Send className="size-4 text-white" />
                </Button>
              </div>

              {error ? (
                <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : null}

              <p className="mx-auto mt-3 flex max-w-2xl items-center justify-center gap-1.5 text-center text-[11px] text-[#7c5cad] dark:text-violet-400">
                <Lock className="size-3 shrink-0 text-[#8b5cf6] dark:text-violet-400" />
                Tudo que você compartilha é privado e seguro.
              </p>
            </footer>
          </main>
        </MedizChatV2Shell>
      </SidebarInset>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </SidebarProvider>
  )
}
