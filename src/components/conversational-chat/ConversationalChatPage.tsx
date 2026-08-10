'use client'

import { MessageSquarePlus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { AppSidebar } from '@/components/app-sidebar'
import { ChatAppHeader } from '@/components/chat/ChatAppHeader'
import {
  ChatConversation,
  type ChatMessage,
  type ConversationAgent
} from '@/components/chat/ChatConversation'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import {
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { useLanguage } from '@/i18n/useLanguage'
import type { ConversationalChatKind } from '@/lib/conversational-chat/config'
import type { SimulatorMode } from '@/lib/conversational-chat/simulator-modes'
import { FirstName } from '@/lib/utils'
import { cn } from '@/lib/utils'

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
  /**
   * Fundo da página. Cada módulo pode ter a sua cor — os componentes de
   * conversa (balão, composer, rolagem) seguem os mesmos do chat principal.
   */
  backgroundClassName?: string
}

/** Mesmo fundo do /chat, usado quando a página não informa o seu */
const DEFAULT_BACKGROUND =
  'bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f]'

export function ConversationalChatPage({
  chatKind,
  title,
  subtitle,
  emptyHint,
  startFresh = false,
  initialMessage,
  simulatorMode,
  modePickerHref,
  backgroundClassName
}: ConversationalChatPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handoffId = searchParams.get('handoff')?.trim() ?? ''
  const { language } = useLanguage()
  const { user: userContext } = useUser()
  const { isPremium, isLoading: isLoadingPremium } = useSubscriptionStatus()
  const requiresPremium =
    chatKind === 'PROF' ||
    (chatKind === 'SIMULADOR' && simulatorMode === 'terapeuta')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [animateIds, setAnimateIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const autoStartedRef = useRef(false)

  const agent: ConversationAgent = chatKind === 'PROF' ? 'prof' : 'simulador'

  const userName = userContext?.name
    ? FirstName(userContext.name)
    : userContext?.fullName
      ? FirstName(userContext.fullName)
      : ''

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
    if (requiresPremium && !isPremium && !isLoadingPremium) {
      setShowUpgrade(true)
      return true
    }
    return false
  }, [isPremium, isLoadingPremium, requiresPremium])

  useEffect(() => {
    if (isLoadingPremium) return
    if (requiresPremium && !isPremium) {
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
          if (!cancelled) {
            // Histórico entra montado, sem animação de chegada.
            setAnimateIds(new Set())
            setMessages(msgs)
          }
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
  }, [
    isLoadingPremium,
    isPremium,
    loadSessions,
    loadThread,
    requiresPremium,
    startFresh
  ])

  const sendMessageWithText = useCallback(
    async (rawText: string, requestedHandoffId?: string) => {
      if (openUpgradeForFreeUser()) return

      const text = rawText.trim()
      if ((!text && !requestedHandoffId) || loading) return

      setLoading(true)
      setError(null)
      setInput('')

      const optimisticId = text ? `temp-${Date.now()}` : null
      if (optimisticId) {
        setMessages((prev) => [
          ...prev,
          {
            id: optimisticId,
            role: 'USER',
            content: text,
            createdAt: new Date().toISOString()
          }
        ])
      }

      try {
        const res = await fetch('/api/conversational-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            threadId: threadId ?? undefined,
            chatKind,
            language,
            ...(requestedHandoffId
              ? { handoffId: requestedHandoffId }
              : {}),
            ...(simulatorMode ? { simulatorMode } : {})
          })
        })

        const rawBody = await res.text()
        let data: {
          error?: string
          details?: string
          threadId?: string
          messages?: ChatMessage[]
          newMessages?: ChatMessage[]
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
            if (optimisticId) {
              setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
            }
            setInput(text)
            return
          }
          if (data.details) {
            console.error('[conversational-chat]', data.details)
          }
          throw new Error(data.error || 'Erro ao enviar mensagem')
        }

        // Só o lote recém-chegado anima: a bolha do usuário remonta quando o id
        // otimista (`temp-…`) vira o id real e não pode reanimar por causa disso.
        setAnimateIds(
          new Set((data.newMessages ?? []).map((message) => message.id))
        )
        setThreadId(data.threadId ?? null)
        setMessages(data.messages ?? [])

        const list = await loadSessions()
        setSessions(list)
      } catch (err) {
        if (optimisticId) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        }
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
      (!initialMessage && !handoffId) ||
      autoStartedRef.current ||
      isLoadingPremium ||
      (requiresPremium && !isPremium) ||
      loadingHistory
    ) {
      return
    }
    autoStartedRef.current = true
    if (handoffId) {
      void sendMessageWithText('', handoffId)
      return
    }
    void sendMessageWithText(initialMessage ?? '')
  }, [
    initialMessage,
    handoffId,
    isLoadingPremium,
    isPremium,
    requiresPremium,
    loadingHistory,
    sendMessageWithText
  ])

  const startNewConversation = () => {
    if (openUpgradeForFreeUser()) return
    if (modePickerHref) {
      router.push(modePickerHref)
      return
    }
    setThreadId(null)
    setMessages([])
    setAnimateIds(new Set())
    setError(null)
    setInput('')
    setHistoryOpen(false)
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
      setAnimateIds(new Set())
      setMessages(msgs)
      setHistoryOpen(false)
    } catch {
      setError('Erro ao abrir conversa')
    } finally {
      setLoading(false)
    }
  }

  const emptyState = (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-12 text-center">
      <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-200 sm:text-lg">
        {loadingHistory ? (
          'Carregando…'
        ) : userName ? (
          <>
            Oi, {userName}… {emptyHint}
          </>
        ) : (
          emptyHint
        )}
      </p>
      {modePickerHref ? (
        <a
          href={modePickerHref}
          className="mt-3 text-xs font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
        >
          Trocar modo de simulação
        </a>
      ) : null}
    </div>
  )

  return (
    <SidebarProvider
      className={cn(
        'relative isolate h-svh overflow-hidden',
        'before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl',
        'after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl',
        'dark:before:bg-violet-700/10 dark:after:bg-violet-950/10',
        backgroundClassName ?? DEFAULT_BACKGROUND
      )}
    >
      {/*
        Sem `onNewChat`/`onStartAgentChat`: nestes módulos os itens da sidebar
        precisam navegar de verdade para /chat, e não reiniciar a conversa atual.
      */}
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={() => {}}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden !bg-transparent">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-foreground">
          <ChatAppHeader
            onSuggestion={() => router.push('/suggestion')}
            onHistory={() => {
              if (openUpgradeForFreeUser()) return
              setHistoryOpen(true)
            }}
          />

          <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent">
            <ChatConversation
              agent={agent}
              label={title}
              subtitle={subtitle}
              emptyState={emptyState}
              messages={messages}
              animateIds={animateIds}
              input={input}
              loading={loading}
              showThinking={loading}
              thinkingLabel="Digitando…"
              error={error}
              onInputChange={setInput}
              onSubmit={() => void sendMessageWithText(input)}
              onSubmitText={(text) => void sendMessageWithText(text)}
              onNewConversation={startNewConversation}
              newConversationLabel={
                modePickerHref ? 'Trocar modo' : 'Nova conversa'
              }
            />
          </main>
        </div>
      </SidebarInset>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
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
                    'bg-violet-100 font-medium text-violet-900 dark:bg-violet-950/70 dark:text-violet-200'
                )}
              >
                <span className="line-clamp-2">
                  {session.firstUserMessage || 'Conversa'}
                </span>
              </button>
            ))}
            {!loadingHistory && sessions.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhuma conversa ainda.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </SidebarProvider>
  )
}
