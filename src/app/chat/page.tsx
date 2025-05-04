'use client'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Separator } from '@radix-ui/react-separator'
import { Search } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Result } from './result'

type ChatSession = {
  id: string
  threadId: string
  createdAt: string
  firstUserMessage: string
}

export default function Page() {
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [history, setHistory] = useState<ChatSession[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)

  // 1) busca histórico + firstUserMessage ao montar
  useEffect(() => {
    async function loadHistory() {
      // pega sessões básicas
      const sessions: Omit<ChatSession, 'firstUserMessage'>[] = await fetch(
        '/api/chat/sessions'
      ).then(r => r.json())

      // paraleliza busca da primeira mensagem de cada thread
      const withFirst = await Promise.all(
        sessions.map(async s => {
          const resp = await fetch(
            `/api/openai/messages/user-messages?threadId=${s.threadId}`
          )
          const { firstUserMessage } = await resp.json()
          return { ...s, firstUserMessage }
        })
      )

      setHistory(withFirst)
    }

    loadHistory()
  }, [])

  // 2) carrega mensagens quando seleciona um histórico
  useEffect(() => {
    if (!selectedThread) return
    setLoading(true)
    fetch(`/api/openai/messages?threadId=${selectedThread}`)
      .then(r => r.json())
      .then(data => {
        setResponses(data.responses.assistant || [])
      })
      .finally(() => setLoading(false))
  }, [selectedThread])

  // 3) nova pesquisa sempre cria thread + sessão, igual antes
  const handleSendMessage = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResponses([])

    const res = await fetch('/api/openai', {
      method: 'POST',
      body: JSON.stringify({ message: input }),
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    console.log(data)
    if (data.threadId) {
      setSelectedThread(data.threadId)
      // recarrega histórico pra incluir a sessão recém-criada
      setHistory(prev => [
        {
          id: data.threadId,
          threadId: data.threadId,
          createdAt: new Date().toISOString(),
          firstUserMessage: input.trim()
        },
        ...prev
      ])
    }
    if (data.responses?.length) setResponses([data.responses.assistant[0]])
    setInput('') // limpa campo
    setLoading(false)
  }

  return (
    <SidebarProvider>
      <AppSidebar
        history={history}
        selectedThread={selectedThread}
        onSelectSession={setSelectedThread}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 z-50" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <div className="flex flex-1 gap-4 p-4 -mt-32 align-middle h-svh justify-center">
          <div className="w-full flex flex-col align-middle justify-center gap-6 max-w-4xl">
            <div className="flex justify-center align-middle">
              <Image
                src={'/imgs/logo.svg'}
                alt="logo da mediz"
                width={250}
                height={150}
              />
            </div>
            <p className="text-2xl text-center">Como posso ajudar?</p>
            <div className="flex align-middle justify-center">
              <div className="w-full flex flex-row gap-1">
                <Input
                  type="search"
                  placeholder="Digite o que procura..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={loading}
                />
                <Button onClick={handleSendMessage} disabled={loading}>
                  {loading ? '...' : <Search />}
                </Button>
              </div>
            </div>

            {responses.length > 0 && (
              <div className="mt-6">
                {responses.map((md, idx) => (
                  <Result key={idx} markdown={md} />
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
