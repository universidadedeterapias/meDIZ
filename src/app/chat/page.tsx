// src/app/chat/page.tsx
'use client'

import { Bell, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { ClientOnly } from '@/components/ClientOnly'
import { ExternalLinks } from '@/components/ExternalLinks'
import { Footer } from '@/components/Footer'
import OptionSelector from '@/components/form/OptionSelector'
import DynamicOptionSelector from '@/components/form/DynamicOptionSelector'
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder'
import PromotionPopup from '@/components/PromotionPopup'
import Spinner from '@/components/Spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { UserPeriod } from '@/lib/userPeriod'
import { FirstName } from '@/lib/utils'
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

  // Estados principais
  const [user, setUser] = useState<User | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  
  // Estados relacionados às regras de uso do plano gratuito
  const [userPeriod, setUserPeriod] = useState<'first-week' | 'first-month' | 'beyond-month'>('first-week')
  const [fullVisualization, setFullVisualization] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  
  // Estados para sintomas dinâmicos
  const [dynamicSymptoms, setDynamicSymptoms] = useState<{sintoma: string, quantidade: number}[]>([])
  const [symptomsLoaded, setSymptomsLoaded] = useState(false)

  // Carrega sintomas dinâmicos
  useEffect(() => {
    async function loadDynamicSymptoms() {
      try {
        const response = await fetch('/api/symptoms/popular')
        const data = await response.json()
        
        if (data.success && data.sintomas) {
          setDynamicSymptoms(data.sintomas)
          setSymptomsLoaded(true)
        } else {
          // Fallback para sintomas fixos
          setSymptomsLoaded(true)
        }
      } catch (error) {
        console.error('Erro ao carregar sintomas dinâmicos:', error)
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
        const res = await fetch('/api/user')
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

  // 2) Carrega respostas do OpenAI quando selecionar uma thread
  useEffect(() => {
    if (checkingProfile || !selectedThread) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/openai/messages?threadId=${selectedThread}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setResponses(data.responses.assistant || [])
      })
      .catch(console.error)
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
    setLoading(true)
    setResponses([])
    setElapsedMs(null)

    const t0 = performance.now()

    try {
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() })
      })

      if (res.status === 403) {
        const data = await res.json()
        if (data.limitReached) {
          setLimitReached(true)
          return
        }
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
      
      if (data.responses?.assistant?.length) {
        setResponses(data.responses.assistant)
      }
      const t1 = performance.now()
      setElapsedMs(t1 - t0)
    } catch (err) {
      console.error(err)
    } finally {
      setInput('')
      setLoading(false)
    }
  }
  
  // Função para lidar com clique no botão de assinatura
  const handleSubscribe = () => {
    window.location.href = 'https://go.hotmart.com/N101121884P'
  }

  // Loading enquanto checa o perfil
  if (checkingProfile || !user) {
    return (
      <div className="flex flex-col justify-center items-center min-w-screen min-h-screen p-8 gap-8 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-zinc-100 font-bold text-6xl drop-shadow-lg">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div className="w-full flex items-center justify-center mt-14">
            <Spinner size={48} />
          </div>
        </div>
        <p className="text-zinc-100 text-lg font-bold">Bem-vindo!</p>
      </div>
    )
  }

  if (limitReached) {
    window.location.href = 'https://go.hotmart.com/N101121884P'
  }

  // Layout principal do chat
  return (
    <SidebarProvider>
      <AppSidebar
        history={[]} // implemente seu histórico se quiser
        selectedThread={selectedThread}
        onSelectSession={setSelectedThread}
      />

      <SidebarInset>
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="w-full sticky top-0 z-10 flex items-center h-16 bg-zinc-50 p-4 shadow-sm">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <div className="flex flex-row items-center">
                  <Avatar className="w-8 h-8 border-2 border-indigo-600">
                    <AvatarImage
                      src={userContext?.image ?? undefined}
                      alt="User"
                    />
                    <AvatarFallback>
                      {FirstName(user.name).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="ml-2 scroll-m-20 text-xl font-semibold tracking-tight text-indigo-600">
                    Olá, {FirstName(user.name)}!
                  </h2>
                </div>
              </div>
              <Bell className="mr-2" />
            </div>
          </header>

          {/* Busca */}
          <div className="flex flex-col items-center gap-4 py-6 px-4 bg-zinc-100">
            <p className="text-indigo-600 font-bold text-3xl">
              me<span className="uppercase">diz</span>
              <span className="text-yellow-400">!</span>
            </p>
            <div className="w-full max-w-4xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Digite uma dor, doença ou sintoma"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                  className="w-full pl-10 pr-24 py-6 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading}
                  className="absolute inset-y-1 right-1 rounded-sm px-6 py-4 min-h-[41.5px] bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {loading ? '...' : 'Buscar'}
                </Button>
              </div>
            </div>
          </div>

          {/* Links externos se houver resposta */}
          {responses.length > 0 && (
            <section className="w-full px-6 bg-zinc-100 pb-4">
              <ExternalLinks />
            </section>
          )}

          {/* Corpo da conversa */}
          <main className="flex-1 overflow-y-auto px-4 pb-6 bg-zinc-100">
            {loading ? (
              <ClientOnly>
                <LoadingPlaceholder />
              </ClientOnly>
            ) : responses.length === 0 ? (
              <div className="w-full max-w-4xl mt-4 flex flex-col gap-4">
                <Label className="text-zinc-400">Mais buscados:</Label>
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
                    options={[
                      { label: 'Dor nas costas', value: 'Dor nas costas' },
                      { label: 'Pressão alta', value: 'Pressão alta' },
                      { label: 'Cansaço', value: 'Cansaço' },
                      { label: 'Enxaqueca', value: 'Enxaqueca' },
                      { label: 'Insônia', value: 'Insônia' },
                      { label: 'Ansiedade', value: 'Ansiedade' },
                      { label: 'Rinite', value: 'Rinite' },
                      { label: 'Dor no joelho', value: 'Dor no joelho' },
                      { label: 'Estresse', value: 'Estresse' },
                      { label: 'Dor de cabeça', value: 'Dor de cabeça' }
                    ]}
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
