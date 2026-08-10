import { forwardRef } from 'react'
import { HeartPulse, Home, PawPrint } from 'lucide-react'

import type { SpecialistAgent } from '@/lib/conversational-chat/config'
import { cn } from '@/lib/utils'

export const CARD_WIDTH = 540
export const CARD_HEIGHT = 675

const cardMeta: Record<
  SpecialistAgent,
  { label: string; Icon: typeof HeartPulse; gradient: string }
> = {
  body: {
    label: 'Meu corpo',
    Icon: HeartPulse,
    gradient: 'from-violet-600 to-purple-600'
  },
  home: {
    label: 'Minha casa',
    Icon: Home,
    gradient: 'from-sky-500 to-cyan-600'
  },
  pet: {
    label: 'Meu pet',
    Icon: PawPrint,
    gradient: 'from-amber-500 to-orange-600'
  }
}

type ShareConversationCardProps = {
  agent: SpecialistAgent
  excerpt: string
  linkLabel: string
}

export const ShareConversationCard = forwardRef<
  HTMLDivElement,
  ShareConversationCardProps
>(function ShareConversationCard({ agent, excerpt, linkLabel }, ref) {
  const { label, Icon, gradient } = cardMeta[agent]

  return (
    <div
      ref={ref}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className={cn(
        'flex flex-col justify-between bg-gradient-to-br p-9 text-white',
        gradient
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <Icon className="size-5" />
        </span>
        <span className="text-lg font-semibold">{label}</span>
      </div>

      <div className="rounded-3xl bg-white/95 p-6 text-zinc-800 shadow-xl">
        <p className="whitespace-pre-wrap text-[17px] leading-relaxed">
          {excerpt}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold">
          me<span className="uppercase">diz</span>
          <span className="text-yellow-300">!</span>
        </p>
        <p className="text-sm font-medium text-white/90">{linkLabel}</p>
      </div>
    </div>
  )
})
