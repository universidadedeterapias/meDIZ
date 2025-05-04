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
import { Search, X } from 'lucide-react'
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

      {/* wrapper full-height */}
      <SidebarInset className="flex flex-col h-screen">
        {/* header sempre visível */}
        <header className="sticky top-0 z-10 flex items-center h-16 bg-primary px-4 shadow-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-6" />
          {/* opcional: logo menor ou título */}
        </header>

        {/* bloco de logo + frase + busca (fixo logo e input) */}
        <div className="flex flex-col items-center gap-4 py-6 px-4">
          <p className="text-indigo-600 font-bold text-3xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div className="w-full max-w-4xl flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Ex.: Dor de cabeça"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                disabled={loading}
                className="pl-10 pr-10 py-6 border-2 border-gray-300 
    focus:border-indigo-600 focus:outline-none 
    transition-colors"
              />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* botão externo de busca */}
            <Button
              onClick={handleSendMessage}
              disabled={loading}
              className="py-6 border-2 border-primary"
            >
              {loading ? '...' : <Search />}
            </Button>
          </div>
        </div>

        {/* área de respostas – scroll somente aqui */}
        <main className="flex-1 overflow-y-auto px-4 pb-6">
          {responses.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-4">
              {responses.map((md, idx) => (
                <Result key={idx} markdown={md} />
              ))}
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
