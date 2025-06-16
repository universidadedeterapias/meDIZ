'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { ExternalLinks } from '@/components/ExternalLinks'
import { Footer } from '@/components/Footer'
import OptionSelector from '@/components/form/OptionSelector'
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Search } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Result } from './result'

// type ChatSession = {
//   id: string
//   threadId: string
//   createdAt: string
//   firstUserMessage: string
// }

type User = {
  image: string
  name: string
}

export default function Page() {
  const router = useRouter()

  // States
  const [user, setUser] = useState({} as User)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  // const [history, setHistory] = useState<ChatSession[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)

  // Validate profile
  useEffect(() => {
    let cancelled = false

    async function checkUserProfile() {
      try {
        const res = await fetch('/api/user')
        if (!res.ok) {
          router.replace('/login')
          return
        }
        const user = await res.json()
        const missing =
          !user.fullName ||
          !user.age ||
          !user.gender ||
          !user.profession ||
          !user.appUsage ||
          !user.description

        if (missing) {
          router.replace('/form')
        } else if (!cancelled) {
          setCheckingProfile(false)
          setUser(user)
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

  // Load history
  // useEffect(() => {
  //   if (checkingProfile) return
  //   let cancelled = false

  //   async function loadHistory() {
  //     try {
  //       const sessions: Omit<ChatSession, 'firstUserMessage'>[] = await fetch(
  //         '/api/chat/sessions'
  //       ).then(r => r.json())

  //       const withFirst = await Promise.all(
  //         sessions.map(async s => {
  //           const resp = await fetch(
  //             `/api/openai/messages/user-messages?threadId=${s.threadId}`
  //           )
  //           const { firstUserMessage } = await resp.json()
  //           return { ...s, firstUserMessage }
  //         })
  //       )

  //       if (!cancelled) setHistory(withFirst)
  //     } catch (err) {
  //       console.error(err)
  //     }
  //   }

  //   loadHistory()
  //   return () => {
  //     cancelled = true
  //   }
  // }, [checkingProfile])

  // Fetch responses for selected thread
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

  // Send message
  const handleSendMessage = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResponses([])

    try {
      const res = await fetch('/api/openai', {
        method: 'POST',
        body: JSON.stringify({ message: input.trim() }),
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()

      if (data.threadId) {
        setSelectedThread(data.threadId)
        // setHistory(prev => [
        //   {
        //     id: data.threadId,
        //     threadId: data.threadId,
        //     createdAt: new Date().toISOString(),
        //     firstUserMessage: input.trim()
        //   },
        //   ...prev
        // ])
      }
      if (data.responses?.length) {
        setResponses([data.responses.assistant[0]])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setInput('')
      setLoading(false)
    }
  }

  // Loading state
  if (checkingProfile) {
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

  // Main chat layout
  return (
    <SidebarProvider>
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={function (): void {
          throw new Error('Function not implemented.')
        }} // history={history}
        // selectedThread={selectedThread}
        // onSelectSession={setSelectedThread}
      />

      <SidebarInset>
        {/* Header */}
        <div className="flex flex-col h-screen overflow-hidden">
          <header className="w-full sticky top-0 z-10 flex items-center h-16 bg-zinc-50 p-4 shadow-sm">
            <div className="w-full">
              <Image
                src={user.image}
                alt="User"
                width={48}
                height={48}
                className="rounded-full border-2 border-indigo-600"
              />
            </div>
            <SidebarTrigger className="-ml-1" />
          </header>

          {/* Logo + Busca */}
          <div className="flex flex-col items-center gap-4 py-6 px-4 bg-zinc-100">
            <p className="text-indigo-600 font-bold text-3xl">
              me<span className="uppercase">diz</span>
              <span className="text-yellow-400">!</span>
            </p>
            <div className="w-full max-w-4xl">
              {/* input + botão Buscar */}
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
                  className="w-full pl-10 pr-24 py-6 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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

          {/* Carrossel de links externos — só aparece quando há respostas */}
          {responses.length > 0 && (
            <section className="w-full bg-zinc-100 pb-4">
              <ExternalLinks />
            </section>
          )}

          {/* Respostas e Mais Buscados */}
          <main className="flex-1 overflow-y-auto px-4 pb-6 bg-zinc-100">
            {loading ? (
              <LoadingPlaceholder />
            ) : responses.length === 0 ? (
              <div className="w-full max-w-4xl mt-4 flex flex-col gap-4">
                <Label className="text-zinc-400">Mais buscados:</Label>
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
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {responses.map((md, idx) => (
                  <Result key={idx} markdown={md} />
                ))}
              </div>
            )}
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
