// src/app/pesquisa/page.tsx
'use client'

/// <reference lib="dom" />

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { ChatAppHeader } from '@/components/chat/ChatAppHeader'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { ClientOnly } from '@/components/ClientOnly'
import { Footer } from '@/components/Footer'
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder'
import PromotionPopup from '@/components/PromotionPopup'
import Spinner from '@/components/Spinner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { getUpgradeLink } from '@/lib/upgradeLinks'
import { UserPeriod } from '@/lib/userPeriod'
import { FirstName } from '@/lib/utils'
import { User } from '@/types/User'
import { Result } from '../chat/result'

// Tipo exato que vem da API de usuário
type RawUser = {
  image: string
  name?: string
  fullName?: string
  email?: string
  age?: number
  gender?: string
  profession?: string
  appUsage?: string
  description?: string
}

/**
 * Modo pesquisa por sintoma: uma pergunta devolve um relatório estruturado
 * (`Result`), diferente do chat conversacional multi-turno do `/chat`.
 * Atendido por `/api/openai` + webhook n8n `chat-texto`.
 */
export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language } = useTranslation()

  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [originalQuestion, setOriginalQuestion] = useState<string>('')
  const [chatError, setChatError] = useState<string | null>(null)
  const handledThreadParamRef = useRef<string | null>(null)

  // Estados relacionados às regras de uso do plano gratuito
  const [userPeriod, setUserPeriod] = useState<UserPeriod>('first-week')
  const [fullVisualization, setFullVisualization] = useState(true)
  const [showPopup, setShowPopup] = useState(false)

  // 1) Confere perfil e gates de onboarding. A rota é acessível por link direto,
  // então repete as checagens do /chat em vez de confiar na navegação de origem.
  useEffect(() => {
    let cancelled = false

    async function checkUserProfile() {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const res = await fetch('/api/user', {
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId)
        })
        if (!res.ok) {
          router.replace('/login')
          return
        }
        const raw: RawUser = await res.json()

        const missing =
          !raw.fullName ||
          !raw.age ||
          !raw.gender ||
          !raw.profession ||
          !raw.appUsage ||
          !raw.description

        if (missing) {
          router.replace('/form')
          return
        }

        try {
          const discoveryRes = await fetch('/api/discovery/status')
          if (discoveryRes.ok) {
            const discoveryData = await discoveryRes.json()
            if (discoveryData.requiresDiscovery) {
              router.replace('/descoberta')
              return
            }
          }
        } catch {
          // Falha ao consultar descoberta nao deve bloquear o acesso.
        }

        try {
          const tutorialRes = await fetch('/api/tutorial/status')
          if (tutorialRes.ok) {
            const tutorialData = await tutorialRes.json()
            if (tutorialData.requiresTutorial) {
              router.replace('/tutorial')
              return
            }
          }
        } catch {
          // Mesma regra da descoberta: falha de consulta nao prende ninguem.
        }

        if (!cancelled) {
          const display = raw.fullName ?? raw.name ?? ''
          setUser({
            image: raw.image,
            name: display,
            fullName: display,
            email: raw.email!,
            age: raw.age!,
            gender: raw.gender!,
            profession: raw.profession!,
            appUsage: raw.appUsage!,
            description: raw.description!
          })
          setCheckingProfile(false)
        }
      } catch {
        router.replace('/form')
      }
    }

    checkUserProfile()
    return () => {
      cancelled = true
    }
  }, [router])

  // 2) Carrega as respostas quando uma pesquisa antiga é reaberta
  useEffect(() => {
    if (checkingProfile || !selectedThread) return
    let cancelled = false
    setLoading(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    fetch(`/api/openai/messages?threadId=${selectedThread}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setResponses(data.responses?.assistant || [])
        // Histórico não tem cronômetro; a pergunta original vem da própria thread.
        setElapsedMs(0)
        setOriginalQuestion(data.responses?.user?.[0] || '')
      })
      .catch(console.error)
      .finally(() => {
        clearTimeout(timeoutId)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [checkingProfile, selectedThread])

  // 3) Abertura por URL (`/pesquisa?threadId=`), usada pela tela de histórico
  useEffect(() => {
    if (checkingProfile || loading) return
    const requestedThread = searchParams.get('threadId')?.trim()
    if (!requestedThread) return
    if (handledThreadParamRef.current === requestedThread) return

    handledThreadParamRef.current = requestedThread
    router.replace('/pesquisa', { scroll: false })
    setSelectedThread(requestedThread)
  }, [checkingProfile, loading, router, searchParams])

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return
    handleSendMessageFromText(input.trim())
  }

  const handleSendMessageFromText = async (text: string) => {
    if (loading) return
    const trimmedText = text.trim()
    if (!trimmedText) return

    setLoading(true)
    setChatError(null)
    setResponses([])
    setElapsedMs(null)

    // Guarda a pergunta original para o cabeçalho do relatório e para o PDF
    setOriginalQuestion(trimmedText)

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
          setLimitReached(true)
          return
        }
      }

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Erro na API: ${res.status} - ${errorText}`)
      }

      const data = await res.json()

      if (data.threadId) {
        // A thread já vem carregada nesta resposta; marcar como tratada evita
        // que o efeito de abertura por URL recarregue tudo de novo.
        handledThreadParamRef.current = data.threadId
        setSelectedThread(data.threadId)
      }

      if (data.userPeriod) {
        setUserPeriod(data.userPeriod as UserPeriod)
        setFullVisualization(data.fullVisualization || false)
      }

      if (data.shouldShowPopup) {
        setTimeout(() => setShowPopup(true), 2000)
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
      setInput('')
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : t(
              'chat.error.generic',
              'Erro ao processar sua mensagem. Tente novamente.'
            )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = () => {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  const startNewSearch = () => {
    handledThreadParamRef.current = null
    setSelectedThread(null)
    setResponses([])
    setInput('')
    setElapsedMs(null)
    setOriginalQuestion('')
    setChatError(null)
  }

  if (checkingProfile || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-indigo-600 to-purple-600 p-6 sm:p-8">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-zinc-100 font-bold text-6xl drop-shadow-lg">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div className="w-full flex items-center justify-center mt-14">
            <Spinner size={48} />
          </div>
        </div>
        <p className="text-zinc-100 text-lg font-bold">
          {t('chat.loading.welcome', 'Bem-vindo!')}
        </p>
      </div>
    )
  }

  if (limitReached) {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  return (
    <SidebarProvider className="relative isolate h-svh overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      <AppSidebar
        history={[]}
        selectedThread={selectedThread}
        onSelectSession={setSelectedThread}
        onNewChat={startNewSearch}
        onStartAgentChat={agent => router.push(`/chat?start=${agent}`)}
        onSelectSymptom={symptomText => {
          startNewSearch()
          setInput(symptomText)
          handleSendMessageFromText(symptomText)
        }}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden !bg-transparent">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-foreground">
          <ChatAppHeader
            onSuggestion={() => router.push('/suggestion')}
            onBack={() => router.push('/chat')}
          />

          <main className="min-h-0 w-full flex-1 overflow-y-auto bg-transparent">
            <div className="mx-auto flex w-full max-w-4xl flex-col px-3 py-5 sm:px-4 sm:py-7">
              {loading ? (
                <ClientOnly>
                  <LoadingPlaceholder />
                </ClientOnly>
              ) : (
                <>
                  {responses.length === 0 ? (
                    <div className="rounded-[1.5rem] bg-white/65 p-5 shadow-xl shadow-violet-950/5 backdrop-blur-2xl dark:bg-zinc-900/65 dark:shadow-black/20 sm:p-7">
                      <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {t('search.home.greeting', 'Oi')},{' '}
                        {FirstName(user.name)}…
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {t(
                          'search.home.subtitle',
                          'Descreva um sintoma e eu monto um relatório com a possível origem emocional.'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {responses.map((md, idx) => (
                        <Result
                          key={idx}
                          markdown={md}
                          elapsedMs={elapsedMs ?? 0}
                          userPeriod={userPeriod}
                          fullVisualization={fullVisualization}
                          onSubscribe={handleSubscribe}
                          userQuestion={originalQuestion}
                          sessionId={selectedThread || undefined}
                        />
                      ))}
                    </div>
                  )}

                  {chatError && (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                      {chatError}
                    </p>
                  )}

                  <ChatComposer
                    value={input}
                    loading={loading}
                    onChange={setInput}
                    onSubmit={handleSendMessage}
                    placeholder={
                      responses.length === 0
                        ? t(
                            'search.input.placeholder',
                            'Qual sintoma você quer pesquisar?'
                          )
                        : t('search.input.again', 'Pesquisar outro sintoma…')
                    }
                    className="sticky bottom-3 z-10 mt-6"
                  />
                </>
              )}
            </div>

            {/* Pop-up entre pesquisas */}
            <PromotionPopup
              open={showPopup}
              onOpenChange={setShowPopup}
              onSubscribe={handleSubscribe}
            />
          </main>

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
