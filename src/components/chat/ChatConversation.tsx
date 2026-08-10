'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import { ShareConversationDialog } from '@/components/chat/ShareConversationDialog'
import { Button } from '@/components/ui/button'
import type { AgentId } from '@/components/chat/ChatHomeExperience'
import type { SpecialistAgent } from '@/lib/conversational-chat/config'
import { cn } from '@/lib/utils'

export type ChatMessage = {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
  action?: { type: 'share' | 'none'; label?: string }
  transition?: { toAgent: AgentId }
}

type ChatConversationProps = {
  agent: AgentId
  messages: ChatMessage[]
  /**
   * Ids que devem animar ao entrar. Fora deste conjunto a bolha monta já no
   * lugar — a mensagem do usuário remonta quando o id otimista (`temp-…`) vira
   * o id real vindo do servidor, e a animação não pode disparar de novo nisso.
   */
  animateIds?: ReadonlySet<string>
  input: string
  loading: boolean
  showThinking?: boolean
  /** Texto do indicador: "Pensando…" esperando o agente, "Digitando…" entre bolhas. */
  thinkingLabel?: string
  error?: string | null
  onInputChange: (value: string) => void
  onSubmit: () => void
  onSubmitText?: (text: string) => void
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
  animateIds,
  input,
  loading,
  showThinking = loading,
  thinkingLabel = 'Pensando…',
  error,
  onInputChange,
  onSubmit,
  onSubmitText,
  onNewConversation
}: ChatConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { label, Icon } = agentMeta[agent]
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    // Só acompanha o fim se o usuário já estava perto dele. Se ele subiu para
    // reler algo, puxar a rolagem a cada bolha do reveal atrapalha a leitura.
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distanceFromBottom > 160) return

    // Direto, sem 'smooth': no reveal escalonado cada mensagem dispara este
    // efeito, e um smooth scroll novo cancelaria o anterior no meio do caminho
    // — é isso que engasga. O deslocamento por bolha é pequeno, então o salto
    // não é percebido.
    container.scrollTop = container.scrollHeight
  }, [loading, messages])

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-3 pb-4 sm:px-5 sm:pb-6">
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 bg-transparent py-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-full bg-white/70 px-3 py-2 shadow-lg shadow-violet-950/5 backdrop-blur-xl dark:bg-zinc-900/70 dark:shadow-black/20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={agent}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
            >
              <Icon className="size-4" />
            </motion.span>
          </AnimatePresence>
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={agent}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {label}
              </motion.p>
            </AnimatePresence>
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

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto py-3 [scrollbar-width:thin]"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              // A animação roda na montagem da bolha. No reveal escalonado cada
              // uma monta no seu tempo, então a entrada acompanha o stagger.
              //
              // Sem deslocamento vertical de propósito: a lista rola sozinha ao
              // receber mensagem, e um translateY simultâneo faz a bolha e a
              // rolagem se moverem em direções diferentes — lê como tremida.
              initial={
                !reduceMotion && animateIds?.has(message.id)
                  ? { opacity: 0, scale: 0.985 }
                  : false
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
              className="flex flex-col gap-1.5"
            >
              {message.transition ? (
                <div className="my-1 flex items-center justify-center gap-2 self-center rounded-full bg-white/60 px-3 py-1.5 text-[11px] font-medium text-zinc-500 shadow-sm backdrop-blur-md dark:bg-zinc-900/60 dark:text-zinc-400">
                  {(() => {
                    const TransitionIcon = agentMeta[message.transition.toAgent].Icon
                    return <TransitionIcon className="size-3.5 text-violet-600 dark:text-violet-300" />
                  })()}
                  Você foi transferido para {agentMeta[message.transition.toAgent].label}
                </div>
              ) : null}
              <div
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

              {message.role === 'ASSISTANT' &&
              message.action?.type === 'share' &&
              agent !== 'concierge' ? (
                <div className="ml-10 max-w-[min(86%,26rem)]">
                  <ShareConversationDialog
                    agent={agent as SpecialistAgent}
                    content={message.content}
                    label={message.action.label}
                  />
                </div>
              ) : null}
            </motion.div>
          ))}

          <AnimatePresence>
            {showThinking ? (
              <motion.div
                key="thinking"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-zinc-900/80">
                  <Sparkles className="size-4 animate-pulse text-violet-600 dark:text-violet-300" />
                </span>
                <span>{thinkingLabel}</span>
                <span aria-hidden className="flex items-end gap-0.5 pb-0.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1 rounded-full bg-current"
                      animate={
                        reduceMotion ? undefined : { opacity: [0.25, 1, 0.25] }
                      }
                      transition={{
                        duration: 1.05,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: dot * 0.16
                      }}
                    />
                  ))}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* respiro no fim da lista, acima do composer */}
          <div aria-hidden />
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
        onSubmitText={onSubmitText}
        placeholder="Continue a conversa…"
        className="mx-auto shrink-0 max-w-2xl"
      />
    </section>
  )
}
