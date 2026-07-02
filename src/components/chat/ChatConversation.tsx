'use client'

import { useEffect, useRef } from 'react'
import {
  HeartPulse,
  Home,
  MessageCircleMore,
  PawPrint,
  Plus,
  Sparkles
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { ChatComposer } from '@/components/chat/ChatComposer'
import { Button } from '@/components/ui/button'
import type { AgentId } from '@/components/chat/ChatHomeExperience'
import { cn } from '@/lib/utils'

export type ChatMessage = {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

type ChatConversationProps = {
  agent: AgentId
  messages: ChatMessage[]
  input: string
  loading: boolean
  showThinking?: boolean
  error?: string | null
  onInputChange: (value: string) => void
  onSubmit: () => void
  onNewConversation: () => void
}

const agentMeta = {
  concierge: { label: 'meDIZ!', Icon: MessageCircleMore },
  body: { label: 'Meu corpo', Icon: HeartPulse },
  home: { label: 'Minha casa', Icon: Home },
  pet: { label: 'Meu pet', Icon: PawPrint }
} satisfies Record<AgentId, { label: string; Icon: typeof HeartPulse }>

export function ChatConversation({
  agent,
  messages,
  input,
  loading,
  showThinking = loading,
  error,
  onInputChange,
  onSubmit,
  onNewConversation
}: ChatConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { label, Icon } = agentMeta[agent]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, messages])

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-3 pb-4 sm:px-5 sm:pb-6">
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 bg-transparent py-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-full bg-white/70 px-3 py-2 shadow-lg shadow-violet-950/5 backdrop-blur-xl dark:bg-zinc-900/70 dark:shadow-black/20">
          <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {label}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Conversa em andamento
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNewConversation}
          className="shrink-0 gap-1.5 rounded-full bg-white/55 text-violet-700 shadow-sm hover:bg-white/80 dark:bg-zinc-900/60 dark:text-violet-200 dark:hover:bg-zinc-800/80"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nova conversa</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3 [scrollbar-width:thin]">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2.5',
                message.role === 'USER'
                  ? 'items-end justify-end'
                  : 'items-start justify-start'
              )}
            >
              {message.role === 'ASSISTANT' ? (
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/75 text-violet-700 shadow-md shadow-violet-950/10 backdrop-blur-xl dark:bg-zinc-900/80 dark:text-violet-200">
                  <Sparkles className="size-4" />
                </span>
              ) : null}

              <div
                className={cn(
                  'max-w-[min(86%,36rem)] px-4 py-3 text-sm leading-relaxed shadow-lg',
                  message.role === 'USER'
                    ? 'rounded-[1.35rem] rounded-br-md bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-violet-600/15'
                    : 'rounded-[1.35rem] rounded-tl-md bg-white/80 text-zinc-800 shadow-violet-950/5 backdrop-blur-xl dark:bg-zinc-900/80 dark:text-zinc-100 dark:shadow-black/20'
                )}
              >
                {message.role === 'ASSISTANT' ? (
                  <div className="prose prose-sm max-w-none prose-headings:my-2 prose-p:my-2 prose-strong:text-inherit dark:prose-invert">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {showThinking ? (
            <div className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-zinc-900/80">
                <Sparkles className="size-4 animate-pulse text-violet-600 dark:text-violet-300" />
              </span>
              <span className="animate-pulse">Pensando…</span>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      {error ? (
        <p className="mb-2 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <ChatComposer
        value={input}
        loading={loading}
        onChange={onInputChange}
        onSubmit={onSubmit}
        placeholder="Continue a conversa…"
        className="mx-auto shrink-0 max-w-2xl"
      />
    </section>
  )
}
