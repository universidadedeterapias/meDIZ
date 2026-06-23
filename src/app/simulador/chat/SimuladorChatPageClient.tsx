'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ConversationalChatPage } from '@/components/conversational-chat/ConversationalChatPage'
import {
  parseSimulatorMode,
  SIMULATOR_MODES
} from '@/lib/conversational-chat/simulator-modes'

export default function SimuladorChatPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = parseSimulatorMode(searchParams.get('mode'))

  useEffect(() => {
    if (!mode) {
      router.replace('/simulador')
    }
  }, [mode, router])

  if (!mode) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const config = SIMULATOR_MODES[mode]

  return (
    <ConversationalChatPage
      chatKind="SIMULADOR"
      title="meDIZ! Simulador"
      subtitle={config.chatSubtitle}
      emptyHint={config.emptyHint}
      startFresh
      initialMessage={config.initialMessage}
      simulatorMode={mode}
      modePickerHref="/simulador"
    />
  )
}
