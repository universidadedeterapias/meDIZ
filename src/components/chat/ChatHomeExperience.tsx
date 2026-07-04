'use client'

import { useRef } from 'react'
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
import { getAgentWelcomeMessage } from '@/lib/conversational-chat/config'
import type {
  MedizAgent,
  ConciergeEntryPoint,
  SpecialistAgent
} from '@/lib/conversational-chat/config'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

export type AgentId = MedizAgent

type ChatHomeExperienceProps = {
  userName: string
  input: string
  loading: boolean
  onInputChange: (value: string) => void
  onSubmit: () => void
  onSubmitText?: (text: string) => void
  onStartConversation: (
    agent: AgentId,
    starter: string,
    entryPoint?: ConciergeEntryPoint
  ) => void
}

const agentStyles: Record<SpecialistAgent, { icon: string }> = {
  body: {
    icon: 'bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 dark:from-violet-500/25 dark:to-purple-500/15 dark:text-violet-200'
  },
  home: {
    icon: 'bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700 dark:from-sky-500/25 dark:to-cyan-500/20 dark:text-sky-200'
  },
  pet: {
    icon: 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 dark:from-amber-500/25 dark:to-orange-500/20 dark:text-amber-200'
  }
}

export function ChatHomeExperience({
  userName,
  input,
  loading,
  onInputChange,
  onSubmit,
  onSubmitText,
  onStartConversation
}: ChatHomeExperienceProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const intents = [
    {
      id: 'pain',
      entryPoint: 'pain' as const,
      label: t('chat.home.intent.pain', 'Estou com dor'),
      starter: t(
        'chat.agent.concierge.welcome',
        'Sinto muito. Pode me falar mais sobre essa dor?'
      )
    },
    {
      id: 'talk',
      entryPoint: 'talk' as const,
      label: t('chat.home.intent.talk', 'Preciso conversar'),
      starter: t(
        'chat.agent.concierge.welcome',
        'Estou aqui. Sobre o que você quer conversar?'
      )
    },
    {
      id: 'research',
      entryPoint: 'research' as const,
      label: t('chat.home.intent.research', 'Quero pesquisar'),
      starter: t(
        'chat.agent.concierge.welcome',
        'Claro! Sobre o que você quer pesquisar?'
      )
    }
  ]

  const agents = [
    {
      id: 'body' as const,
      title: t('chat.home.agent.body.title', 'Meu corpo'),
      description: t('chat.home.agent.body.description', 'Dores e sintomas'),
      starter: t(
        'chat.agent.body.welcome',
        getAgentWelcomeMessage('body')
      ),
      icon: HeartPulse
    },
    {
      id: 'home' as const,
      title: t('chat.home.agent.home.title', 'Minha casa'),
      description: t('chat.home.agent.home.description', 'Sinais do ambiente'),
      starter: t(
        'chat.agent.home.welcome',
        getAgentWelcomeMessage('home')
      ),
      icon: Home
    },
    {
      id: 'pet' as const,
      title: t('chat.home.agent.pet.title', 'Meu pet'),
      description: t('chat.home.agent.pet.description', 'Sintomas do animal'),
      starter: t(
        'chat.agent.pet.welcome',
        getAgentWelcomeMessage('pet')
      ),
      icon: PawPrint
    }
  ]

  const submit = () => {
    if (!input.trim() || loading) return
    onSubmit()
  }

  return (
    <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto px-4 pb-12 pt-7 sm:px-7 sm:pb-16 sm:pt-12">
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
                onClick={() =>
                  onStartConversation(
                    'concierge',
                    intent.starter,
                    intent.entryPoint
                  )
                }
                disabled={loading}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-medium text-zinc-700 shadow-lg shadow-violet-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-violet-950/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:bg-white/10 dark:text-zinc-100 dark:shadow-black/20 dark:hover:bg-white/15"
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
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onStartConversation(agent.id, agent.starter)}
                disabled={loading}
                aria-label={`${agent.title}: ${agent.description}`}
                className={cn(
                  glassPanelClass,
                  'group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-[1.5rem] p-4 text-left shadow-xl shadow-violet-950/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-950/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:shadow-black/25 dark:hover:shadow-black/35 sm:min-h-44 sm:flex-col sm:justify-center sm:p-6 sm:text-center'
                )}
              >
                <span
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-inner sm:size-14',
                    agentStyles[agent.id].icon
                  )}
                >
                  <Icon className="size-6 sm:size-7" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-base font-semibold">{agent.title}</span>
                  <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                    {agent.description}
                  </span>
                </span>
                <ArrowUpRight
                  className={cn(
                    'absolute right-4 top-4 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                    'text-zinc-400 dark:text-zinc-500'
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
        onSubmitText={onSubmitText}
        placeholder={t('chat.home.input.placeholder', 'Conte o que está acontecendo…')}
        className="mt-9"
      />
    </section>
  )
}
