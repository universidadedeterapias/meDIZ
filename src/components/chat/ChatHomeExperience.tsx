'use client'

import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  HeartPulse,
  Home,
  MessageCircleMore,
  PawPrint,
  Search
} from 'lucide-react'

import { ChatComposer } from '@/components/chat/ChatComposer'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

export type AgentId = 'body' | 'home' | 'pet'

type ChatHomeExperienceProps = {
  userName: string
  input: string
  loading: boolean
  selectedAgent: AgentId
  onInputChange: (value: string) => void
  onAgentChange: (agent: AgentId) => void
  onSubmit: () => void
}

const agentStyles: Record<AgentId, { card: string; icon: string }> = {
  body: {
    card: 'from-white via-white to-violet-50/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/20',
    icon: 'bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 dark:from-violet-500/25 dark:to-purple-500/15 dark:text-violet-200'
  },
  home: {
    card: 'from-white via-white to-violet-50/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/20',
    icon: 'bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700 dark:from-sky-500/25 dark:to-cyan-500/20 dark:text-sky-200'
  },
  pet: {
    card: 'from-white via-white to-violet-50/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/20',
    icon: 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-500/25 dark:to-orange-500/20 dark:text-amber-200'
  }
}

export function ChatHomeExperience({
  userName,
  input,
  loading,
  selectedAgent,
  onInputChange,
  onAgentChange,
  onSubmit
}: ChatHomeExperienceProps) {
  const { t } = useTranslation()
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const intents = [
    {
      id: 'pain',
      label: t('chat.home.intent.pain', 'Estou com dor'),
      starter: t('chat.home.intent.painStarter', 'Estou com dor e quero entender melhor')
    },
    {
      id: 'talk',
      label: t('chat.home.intent.talk', 'Preciso conversar'),
      starter: t('chat.home.intent.talkStarter', 'Preciso conversar sobre o que estou sentindo')
    },
    {
      id: 'research',
      label: t('chat.home.intent.research', 'Quero pesquisar'),
      starter: t('chat.home.intent.researchStarter', 'Quero pesquisar sobre um sintoma')
    }
  ]

  const agents = [
    {
      id: 'body' as const,
      title: t('chat.home.agent.body.title', 'Meu corpo'),
      description: t('chat.home.agent.body.description', 'Dores e sintomas'),
      icon: HeartPulse
    },
    {
      id: 'home' as const,
      title: t('chat.home.agent.home.title', 'Minha casa'),
      description: t('chat.home.agent.home.description', 'Sinais do ambiente'),
      icon: Home
    },
    {
      id: 'pet' as const,
      title: t('chat.home.agent.pet.title', 'Meu pet'),
      description: t('chat.home.agent.pet.description', 'Sintomas do animal'),
      icon: PawPrint
    }
  ]

  const selectIntent = (id: string, starter: string) => {
    setSelectedIntent(id)
    onInputChange(starter)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const submit = () => {
    if (!input.trim() || loading) return
    onSubmit()
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-12 pt-7 sm:px-7 sm:pb-16 sm:pt-12">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-slate-50/95 to-violet-100/55 px-6 py-7 shadow-2xl shadow-violet-950/10 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/25 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-20 -z-10 size-56 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-600/10" />
        <p className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          {t('chat.home.greeting', 'Oi')}, {userName}…
        </p>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-300 sm:text-lg">
          {t('chat.home.question', 'O que está acontecendo?')}
        </p>
      </div>

      <div className="mt-8 sm:mt-10">
        <p className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
          {t('chat.home.help.title', 'Posso te ajudar a:')}
        </p>
        <div className="mt-3 flex gap-3 overflow-x-auto px-0.5 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {intents.map((intent, index) => {
            const Icon = index === 0 ? HeartPulse : index === 1 ? MessageCircleMore : Search
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() => selectIntent(intent.id, intent.starter)}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                  selectedIntent === intent.id
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-white/90 text-zinc-700 shadow-lg shadow-violet-950/10 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-violet-950/15 dark:bg-white/10 dark:text-zinc-100 dark:shadow-black/20 dark:hover:bg-white/15'
                )}
              >
                <Icon className="size-4" />
                {intent.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 sm:mt-7">
        <p className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
          {t('chat.home.agents.title', 'Onde você quer olhar?')}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {agents.map((agent) => {
            const Icon = agent.icon
            const selected = selectedAgent === agent.id
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  onAgentChange(agent.id)
                  requestAnimationFrame(() => inputRef.current?.focus())
                }}
                aria-pressed={selected}
                aria-label={`${agent.title}: ${agent.description}`}
                className={cn(
                  'group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-[1.5rem] bg-gradient-to-br p-4 text-left shadow-xl shadow-violet-950/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-950/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:shadow-black/25 dark:hover:shadow-black/35 sm:min-h-44 sm:flex-col sm:justify-center sm:p-6 sm:text-center',
                  agentStyles[agent.id].card,
                  selected && 'from-violet-600 via-violet-600 to-purple-600 text-white shadow-2xl shadow-violet-500/25 dark:from-violet-700 dark:via-violet-700 dark:to-purple-800'
                )}
              >
                <span
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-inner sm:size-14',
                    selected ? 'bg-white/15 text-white' : agentStyles[agent.id].icon
                  )}
                >
                  <Icon className="size-6 sm:size-7" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-base font-semibold">{agent.title}</span>
                  <span className={cn('mt-1 block text-sm', selected ? 'text-white/75' : 'text-zinc-500 dark:text-zinc-400')}>
                    {agent.description}
                  </span>
                </span>
                <ArrowUpRight
                  className={cn(
                    'absolute right-4 top-4 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                    selected ? 'text-white/70' : 'text-zinc-400 dark:text-zinc-500'
                  )}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      </div>

      <ChatComposer
        ref={inputRef}
        value={input}
        loading={loading}
        onChange={onInputChange}
        onSubmit={submit}
        placeholder={t('chat.home.input.placeholder', 'Conte o que está acontecendo…')}
        className="mt-9"
      />
    </section>
  )
}
