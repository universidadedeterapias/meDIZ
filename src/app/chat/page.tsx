// src/app/chat/page.tsx
'use client'

/// <reference lib="dom" />

import { Bell, Search, MessageSquarePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ClientOnly } from '@/components/ClientOnly'
import { ExternalLinks } from '@/components/ExternalLinks'
import { Footer } from '@/components/Footer'
import OptionSelector from '@/components/form/OptionSelector'
import DynamicOptionSelector from '@/components/form/DynamicOptionSelector'
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder'
import PromotionPopup from '@/components/PromotionPopup'
import Spinner from '@/components/Spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { useTranslation } from '@/i18n/useTranslation'
import { UserPeriod } from '@/lib/userPeriod'
import { FirstName } from '@/lib/utils'
import { getUpgradeLink } from '@/lib/upgradeLinks'
import { User } from '@/types/User'
import { Result } from './result'

// Tipo exato que vem da sua API
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

// Tipo que vamos usar internamente, sempre com name/fullName definidos

export default function Page() {
  const router = useRouter()
  const { user: userContext } = useUser()
  const { t, language } = useTranslation()

  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [originalQuestion, setOriginalQuestion] = useState<string>('')
  
  // Estados relacionados às regras de uso do plano gratuito
  const [userPeriod, setUserPeriod] = useState<'first-week' | 'first-month' | 'beyond-month'>('first-week')
  const [fullVisualization, setFullVisualization] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  
  // Estados para sintomas dinâmicos
  const [dynamicSymptoms, setDynamicSymptoms] = useState<{sintoma: string, quantidade: number}[]>([])
  const [symptomsLoaded, setSymptomsLoaded] = useState(false)

  const presetSymptomOptions = [
    {
      label: t('symptoms.backPain', 'Dor nas costas'),
      value: t('symptoms.backPain', 'Dor nas costas')
    },
    {
      label: t('symptoms.highBloodPressure', 'Pressão alta'),
      value: t('symptoms.highBloodPressure', 'Pressão alta')
    },
    {
      label: t('symptoms.fatigue', 'Cansaço'),
      value: t('symptoms.fatigue', 'Cansaço')
    },
    {
      label: t('symptoms.migraine', 'Enxaqueca'),
      value: t('symptoms.migraine', 'Enxaqueca')
    },
    {
      label: t('symptoms.insomnia', 'Insônia'),
      value: t('symptoms.insomnia', 'Insônia')
    },
    {
      label: t('symptoms.anxiety', 'Ansiedade'),
      value: t('symptoms.anxiety', 'Ansiedade')
    },
    {
      label: t('symptoms.rhinitis', 'Rinite'),
      value: t('symptoms.rhinitis', 'Rinite')
    },
    {
      label: t('symptoms.kneePain', 'Dor no joelho'),
      value: t('symptoms.kneePain', 'Dor no joelho')
    },
    {
      label: t('symptoms.stress', 'Estresse'),
      value: t('symptoms.stress', 'Estresse')
    },
    {
      label: t('symptoms.headache', 'Dor de cabeça'),
      value: t('symptoms.headache', 'Dor de cabeça')
    }
  ]

  // Carrega sintomas dinâmicos
  useEffect(() => {
    async function loadDynamicSymptoms() {
      try {
        // Timeout de 30 segundos para carregamento de sintomas
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
        
        const response = await fetch('/api/symptoms/popular', {
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId)
        })
        const data = await response.json()
        
        if (data.success && data.sintomas) {
          setDynamicSymptoms(data.sintomas)
          setSymptomsLoaded(true)
        } else {
          // Fallback para sintomas fixos
          setSymptomsLoaded(true)
        }
      } catch (error) {
        // Evita logar objetos Event diretamente
        if (error instanceof Error) {
          console.error('Erro ao carregar sintomas dinâmicos:', {
            name: error.name,
            message: error.message
          })
        } else {
          console.error('Erro ao carregar sintomas dinâmicos:', error)
        }
        // Fallback para sintomas fixos
        setSymptomsLoaded(true)
      }
    }

    loadDynamicSymptoms()
  }, [])

  // 1) Confira perfil e normalize o nome
  useEffect(() => {
    let cancelled = false

    async function checkUserProfile() {
      try {
        // Timeout de 30 segundos para carregamento de usuário
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
        
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

        // checa se faltam campos obrigatórios do form
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

        if (!cancelled) {
          // escolhe fullName se existir, senão name
          const display = raw.fullName ?? raw.name ?? ''
          setUser({
            image: raw.image,
            // garantimos que ambos existam para os componentes que usam name/fullName
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

  // 2) Carrega respostas do chat quando selecionar uma thread
  useEffect(() => {
    if (checkingProfile || !selectedThread) return
    let cancelled = false
    setLoading(true)

    // Timeout de 60 segundos para carregamento de mensagens
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
    
    fetch(`/api/openai/messages?threadId=${selectedThread}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setResponses(data.responses.assistant || [])
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

  // 3) Envia mensagem
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return // Evita múltiplas chamadas
    handleSendMessageFromText(input.trim())
  }

  // Função reutilizável para enviar mensagem
  const handleSendMessageFromText = async (text: string) => {
    if (loading) return
    setLoading(true)
    setResponses([])
    setElapsedMs(null)
    
    // Armazena a pergunta original para o PDF
    setOriginalQuestion(text)
    setInput(text) // Atualiza o input

    const t0 = performance.now()

    try {
      // Timeout de 60 segundos para requisições de chat
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos
      
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Inclui cookies na requisição
        signal: controller.signal,
        body: JSON.stringify({ message: text, language })
      }).finally(() => {
        clearTimeout(timeoutId)
      })

      // Verifica se houve erro de autenticação
      if (res.status === 401) {
        console.error('[Chat] Não autenticado, redirecionando para login...')
        router.replace('/login')
        setLoading(false)
        return
      }

      if (res.status === 403) {
        const data = await res.json()
        if (data.limitReached) {
          setLimitReached(true)
          setLoading(false)
          return
        }
      }

      // Verifica se a resposta é JSON válida
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Chat] Erro na API:', res.status, errorText)
        throw new Error(`Erro na API: ${res.status} - ${errorText}`)
      }

      const data = await res.json()

      if (data.threadId) {
        setSelectedThread(data.threadId)
      }
      
      // Processa informações do período do usuário e visualização
      if (data.userPeriod) {
        setUserPeriod(data.userPeriod as UserPeriod)
        setFullVisualization(data.fullVisualization || false)
      }
      
      // Verifica se deve mostrar o popup entre pesquisas
      if (data.shouldShowPopup) {
        // Atrasa a exibição do popup para após a exibição da resposta
        setTimeout(() => {
          setShowPopup(true)
        }, 2000)
      }
      
      // Valida e processa as respostas
      if (data.responses?.assistant && Array.isArray(data.responses.assistant) && data.responses.assistant.length > 0) {
        setResponses(data.responses.assistant)
      } else if (data.responses?.assistant && typeof data.responses.assistant === 'string') {
        // Fallback: se assistant for uma string ao invés de array
        setResponses([data.responses.assistant])
      } else {
        console.error('[Chat] Resposta inválida ou vazia')
        throw new Error('Resposta inválida do servidor')
      }
      const t1 = performance.now()
      setElapsedMs(t1 - t0)
    } catch (err) {
      // Evita logar objetos Event diretamente
      if (err instanceof Error) {
        console.error('[Chat] Erro ao enviar mensagem:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        })
        alert(`${t('chat.error.prefix', 'Erro ao processar sua mensagem')}: ${err.message}`)
      } else if (err && typeof err === 'object' && 'type' in err) {
        // Pode ser um Event object
        console.error('[Chat] Erro (tipo: Event):', (err as { type?: string }).type || 'Unknown')
        alert(t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.'))
      } else {
        console.error('[Chat] Erro ao enviar mensagem:', err)
        alert(t('chat.error.generic', 'Erro ao processar sua mensagem. Tente novamente.'))
      }
    } finally {
      setInput('')
      setLoading(false)
    }
  }
  
  // Função para lidar com clique no botão de assinatura
  const handleSubscribe = () => {
    const upgradeLink = getUpgradeLink(language)
    window.location.href = upgradeLink
  }

  // Loading enquanto checa o perfil
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

  // Layout principal do chat
  return (
    <SidebarProvider>
      <AppSidebar
        history={[]} // implemente seu histórico se quiser
        selectedThread={selectedThread}
        onSelectSession={setSelectedThread}
        onSelectSymptom={(symptomText) => {
          setInput(symptomText)
          setResponses([])
          setSelectedThread(null)
          handleSendMessageFromText(symptomText)
        }}
      />

      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-14 w-full min-w-0 items-center border-b border-border bg-background px-3 py-2 shadow-sm sm:h-16 sm:px-4 sm:py-0">
            <div className="flex w-full min-w-0 items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-4">
                <SidebarTrigger className="-ml-1 flex-shrink-0" />
                <div className="flex flex-row items-center min-w-0">
                  <Avatar className="w-8 h-8 border-2 border-indigo-600 flex-shrink-0">
                    <AvatarImage
                      src={userContext?.image ?? undefined}
                      alt="User"
                    />
                    <AvatarFallback>
                      {FirstName(user.name).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="ml-2 scroll-m-20 truncate text-base font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-xl">
                    {t('chat.greeting.prefix', 'Olá')}, {FirstName(user.name)}!
                  </h2>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-4">
                <div className="relative group cursor-pointer" onClick={() => router.push('/suggestion')}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push('/suggestion')
                    }}
                    className="flex h-9 items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 text-white shadow-md transition-all duration-200 hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg group-hover:scale-105 sm:h-10 sm:px-4"
                    size="default"
                  >
                    <MessageSquarePlus className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{t('sidebar.suggestion.button', 'Sugestão')}</span>
                  </Button>
                  <Badge 
                    className="absolute -top-2 -left-2 z-10 hidden cursor-pointer border-none bg-green-500 text-white shadow-lg animate-pulse hover:bg-green-600 sm:flex"
                  >
                    <span className="relative z-10">{t('badge.new.lowercase', 'Novo')}</span>
                    <span className="absolute inset-0 bg-green-400 rounded-md animate-ping opacity-75"></span>
                  </Badge>
                </div>
                <LanguageSwitcher showLabel={false} variant="header" />
                <ThemeToggle variant="icon" />
                <Bell className="hidden h-5 w-5 shrink-0 text-foreground sm:block" />
              </div>
            </div>
          </header>

          {/* Busca */}
          <div className="flex flex-col items-center gap-3 border-b border-border bg-muted/40 px-3 py-4 sm:gap-4 sm:px-4 sm:py-6">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 sm:text-3xl">
              me<span className="uppercase">diz</span>
              <span className="text-yellow-400">!</span>
            </p>
            <div className="w-full max-w-4xl space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder={t('chat.input.placeholder', 'Digite uma dor, doença ou sintoma')}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                  className="w-full rounded-md border border-input bg-background py-4 pl-10 pr-[4.5rem] text-base transition-colors placeholder:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:py-6 sm:pr-28"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading}
                  className="absolute inset-y-1 right-1 min-h-[38px] rounded-sm bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 sm:min-h-[41.5px] sm:px-6 sm:py-4 sm:text-base"
                  aria-label={t('general.search', 'Buscar')}
                >
                  {loading ? (
                    '...'
                  ) : (
                    <>
                      <Search className="h-4 w-4 sm:hidden" />
                      <span className="hidden sm:inline">{t('general.search', 'Buscar')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Links externos se houver resposta */}
          {responses.length > 0 && (
            <section className="w-full min-w-0 border-b border-border bg-muted/30 px-3 pb-4 sm:px-6">
              <ExternalLinks />
            </section>
          )}

          {/* Corpo da conversa */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background px-3 pb-6 sm:px-4">
            {loading ? (
              <ClientOnly>
                <LoadingPlaceholder />
              </ClientOnly>
            ) : responses.length === 0 ? (
              <div className="w-full max-w-4xl mt-4 flex flex-col gap-4">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t('chat.popularQueries', 'Mais buscados:')}
                </Label>
                {symptomsLoaded && dynamicSymptoms.length > 0 ? (
                  <DynamicOptionSelector
                    value={input}
                    onChange={val => {
                      setInput(val)
                      handleSendMessage()
                    }}
                    options={dynamicSymptoms}
                  />
                ) : (
                  <OptionSelector
                    value={input}
                    onChange={val => {
                      setInput(val)
                      handleSendMessage()
                    }}
                    options={presetSymptomOptions}
                  />
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
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
