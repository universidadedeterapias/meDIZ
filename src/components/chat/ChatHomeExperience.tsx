'use client'

import { useRef } from 'react'
import {
  HeartPulse,
  Home,
  MessageCircleMore,
  PawPrint,
  Search
} from 'lucide-react'

import { ChatComposer } from '@/components/chat/ChatComposer'
import { VoiceOrb } from '@/components/chat/VoiceOrb'
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
    <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto px-4 pb-4 pt-4 sm:px-7 sm:pb-6 sm:pt-6">
      {/* Unico elemento flexivel da tela: absorve toda a sobra (ou falta) de altura,
          preenchendo o que os outros blocos (shrink-0) nao usam. Isso e o que faz a
          tela caber sem scroll em qualquer altura de viewport, sem breakpoints fixos —
          a esfera so encolhe/cresce de verdade porque o layout mede o espaço restante.
          O card "Oi, {nome}" vive dentro desse mesmo bloco, flutuando por cima da
          esfera (absolute), em vez de ocupar espaço próprio na coluna. */}
      <div className="relative flex min-h-16 flex-1 items-center justify-center">
        <VoiceOrb className="aspect-square h-full w-auto max-h-80" />

        <div className="absolute bottom-2 left-2 z-10 max-w-[62%] overflow-hidden rounded-2xl bg-white/20 px-3 py-2 shadow-xl shadow-violet-950/10 backdrop-blur-xl dark:bg-zinc-900/20">
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-white">
            {t('chat.home.greeting', 'Oi')}, {userName}…
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
            {t('chat.home.question', 'O que está acontecendo?')}
          </p>
        </div>
      </div>

      <div className="mt-8 shrink-0 sm:mt-10">
        <p className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
          {t('chat.home.help.title', 'Posso te ajudar a:')}
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto px-0.5 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-medium text-zinc-700 shadow-lg shadow-violet-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-violet-950/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:bg-white/10 dark:text-zinc-100 dark:shadow-black/20 dark:hover:bg-white/15"
              >
                <Icon className="size-3.5" />
                {intent.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 shrink-0 sm:mt-7">
        <p className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
          {t('chat.home.agents.title', 'Onde você quer olhar?')}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:gap-5">
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
                  'group flex flex-col items-center justify-center gap-0 rounded-[1.5rem] p-2.5 text-center shadow-xl shadow-violet-950/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-950/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:shadow-black/25 dark:hover:shadow-black/35 sm:p-5'
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-inner sm:size-12',
                    agentStyles[agent.id].icon
                  )}
                >
                  <Icon className="size-5 sm:size-6" strokeWidth={1.7} />
                </span>
                <span className="mt-2 block text-xs font-semibold sm:text-sm">
                  {agent.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
                  {agent.description}
                </span>
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
        className="mt-9 shrink-0"
      />
    </section>
  )
}
