'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import { useTranslation } from '@/i18n/useTranslation'
import type { UserPeriod } from '@/lib/userPeriod'

type UseSymptomSearchOptions = {
  /** Plano gratuito estourou a cota — quem chama decide para onde mandar. */
  onLimitReached: () => void
  /** O servidor pediu o pop-up de assinatura entre pesquisas. */
  onShowPopup: () => void
}

/**
 * Modo pesquisa por sintoma: uma pergunta devolve um relatório estruturado
 * (`Result`), atendido por `/api/openai` + webhook n8n `chat-texto` — o chat
 * legado, não os agentes conversacionais. Compartilhado entre a home do `/chat`
 * (caixa inicial) e a rota `/pesquisa` (reabertura pelo histórico).
 */
export function useSymptomSearch({
  onLimitReached,
  onShowPopup
}: UseSymptomSearchOptions) {
  const router = useRouter()
  const { t, language } = useTranslation()

  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [userPeriod, setUserPeriod] = useState<UserPeriod>('first-week')
  const [fullVisualization, setFullVisualization] = useState(true)
  const loadingRef = useRef(false)

  const search = useCallback(
    async (text: string) => {
      const trimmedText = text.trim()
      if (!trimmedText || loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)
      setResponses([])
      setElapsedMs(null)
      // Guarda a pergunta original para o cabeçalho do relatório e para o PDF
      setQuestion(trimmedText)

      const t0 = performance.now()

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        const res = await fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({ message: trimmedText, language })
        }).finally(() => {
          clearTimeout(timeoutId)
        })

        if (res.status === 401) {
          router.replace('/login')
          return
        }

        if (res.status === 403) {
          const data = await res.json()
          if (data.limitReached) {
            onLimitReached()
            return
          }
        }

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Erro na API: ${res.status} - ${errorText}`)
        }

        const data = await res.json()

        if (data.threadId) setThreadId(data.threadId)

        if (data.userPeriod) {
          setUserPeriod(data.userPeriod as UserPeriod)
          setFullVisualization(data.fullVisualization || false)
        }

        if (data.shouldShowPopup) {
          setTimeout(onShowPopup, 2000)
        }

        if (
          Array.isArray(data.responses?.assistant) &&
          data.responses.assistant.length > 0
        ) {
          setResponses(data.responses.assistant)
        } else if (typeof data.responses?.assistant === 'string') {
          setResponses([data.responses.assistant])
        } else {
          throw new Error('Resposta inválida do servidor')
        }

        setElapsedMs(performance.now() - t0)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t(
                'chat.error.generic',
                'Erro ao processar sua mensagem. Tente novamente.'
              )
        )
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [language, onLimitReached, onShowPopup, router, t]
  )

  // Reabre uma pesquisa antiga (histórico): as respostas vêm da própria thread
  const openThread = useCallback((requestedThread: string) => {
    setThreadId(requestedThread)
    loadingRef.current = true
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    fetch(`/api/openai/messages?threadId=${requestedThread}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        setResponses(data.responses?.assistant || [])
        // Histórico não tem cronômetro; a pergunta original vem da própria thread.
        setElapsedMs(0)
        setQuestion(data.responses?.user?.[0] || '')
      })
      .catch(console.error)
      .finally(() => {
        clearTimeout(timeoutId)
        loadingRef.current = false
        setLoading(false)
      })
  }, [])

  const reset = useCallback(() => {
    setThreadId(null)
    setResponses([])
    setElapsedMs(null)
    setQuestion('')
    setError(null)
  }, [])

  return {
    responses,
    loading,
    threadId,
    elapsedMs,
    question,
    error,
    userPeriod,
    fullVisualization,
    /** Já houve pergunta nesta tela — a home sai do modo inicial. */
    active: loading || responses.length > 0 || Boolean(error) || Boolean(question),
    search,
    openThread,
    reset
  }
}
