'use client'

import {
  ArrowRight,
  HeartPulse,
  Home,
  MessageCircle,
  PawPrint
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { ChatAppHeader } from '@/components/chat/ChatAppHeader'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import type { MedizAgent } from '@/lib/conversational-chat/config'
import { cn } from '@/lib/utils'

type AgentFilter = 'all' | MedizAgent
type PeriodFilter = 'all' | '7d' | '30d'

type HistoryItem = {
  id: string
  threadId: string
  agent: MedizAgent | null
  createdAt: string
  firstUserMessage: string
}

const agentOptions: Array<{ value: AgentFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'body', label: 'Meu corpo' },
  { value: 'home', label: 'Minha casa' },
  { value: 'pet', label: 'Meu pet' }
]

const agentMeta = {
  concierge: {
    label: 'meDIZ!',
    Icon: MessageCircle,
    color: 'text-violet-700 dark:text-violet-200'
  },
  body: {
    label: 'Meu corpo',
    Icon: HeartPulse,
    color: 'text-violet-700 dark:text-violet-200'
  },
  home: {
    label: 'Minha casa',
    Icon: Home,
    color: 'text-sky-700 dark:text-sky-200'
  },
  pet: {
    label: 'Meu pet',
    Icon: PawPrint,
    color: 'text-amber-700 dark:text-amber-200'
  }
} satisfies Record<
  MedizAgent,
  { label: string; Icon: typeof HeartPulse; color: string }
>

export default function ChatHistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [agent, setAgent] = useState<AgentFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          chatKind: 'SEARCH',
          agent,
          period,
          page: String(targetPage),
          limit: '12'
        })
        const response = await fetch(
          `/api/conversational-chat/sessions?${params.toString()}`
        )

        if (response.status === 401) {
          router.replace('/login')
          return
        }
        if (response.status === 403) {
          setAccessDenied(true)
          setItems([])
          return
        }

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Não foi possível carregar o histórico')
        }

        const nextItems = Array.isArray(data.sessions) ? data.sessions : []
        setItems(current => (replace ? nextItems : [...current, ...nextItems]))
        setPage(targetPage)
        setHasMore(Boolean(data.pagination?.hasMore))
        setAccessDenied(false)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível carregar o histórico'
        )
      } finally {
        setLoading(false)
      }
    },
    [agent, period, router]
  )

  useEffect(() => {
    void fetchPage(1, true)
  }, [fetchPage])

  return (
    <SidebarProvider className="relative isolate h-svh overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={() => {}}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden !bg-transparent">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-foreground">
          <ChatAppHeader
            onSuggestion={() => router.push('/suggestion')}
            onBack={() => router.push('/chat')}
          />

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-9">
            <div className="mx-auto w-full max-w-5xl">
              <section className="mt-6 rounded-[1.5rem] bg-white/65 p-4 shadow-xl shadow-violet-950/5 backdrop-blur-2xl dark:bg-zinc-900/65 dark:shadow-black/20 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700/70 dark:text-violet-300/70">
                      Agente
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {agentOptions.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAgent(option.value)}
                          className={cn(
                            'min-h-10 shrink-0 rounded-full px-4 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                            agent === option.value
                              ? 'bg-violet-600 text-white shadow-violet-500/20'
                              : 'bg-white/80 text-zinc-700 hover:bg-white dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-w-44 flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700/70 dark:text-violet-300/70">
                      Período
                    </span>
                    <Select
                      value={period}
                      onValueChange={value => setPeriod(value as PeriodFilter)}
                    >
                      <SelectTrigger
                        className="h-10 rounded-xl border-0 bg-white/80 text-zinc-700 shadow-sm focus:ring-violet-500 dark:bg-white/10 dark:text-zinc-200"
                        aria-label="Filtrar histórico por período"
                      >
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo o período</SelectItem>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="mt-5 space-y-3">
                {accessDenied ? (
                  <div className="rounded-[1.5rem] bg-white/75 p-7 text-center shadow-xl shadow-violet-950/5 backdrop-blur-xl dark:bg-zinc-900/75">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      O histórico está disponível para assinantes.
                    </p>
                    <Button
                      className="mt-4 rounded-full"
                      onClick={() => router.push('/assinatura-plus')}
                    >
                      Conhecer assinatura
                    </Button>
                  </div>
                ) : null}

                {!accessDenied && !loading && items.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-white/70 p-8 text-center shadow-xl shadow-violet-950/5 backdrop-blur-xl dark:bg-zinc-900/70">
                    <MessageCircle className="mx-auto size-8 text-violet-500" />
                    <p className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      Nenhuma conversa encontrada
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Ajuste os filtros ou inicie um novo chat.
                    </p>
                  </div>
                ) : null}

                {items.map(item => {
                  const meta = item.agent ? agentMeta[item.agent] : null
                  const Icon = meta?.Icon ?? MessageCircle
                  const date = new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }).format(new Date(item.createdAt))

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/chat?threadId=${encodeURIComponent(item.threadId)}`
                        )
                      }
                      className="group flex w-full items-center gap-4 rounded-[1.5rem] bg-white/75 p-4 text-left shadow-lg shadow-violet-950/5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-zinc-900/70 dark:shadow-black/20 dark:hover:bg-zinc-900 sm:p-5"
                    >
                      <span
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-inner dark:bg-white/10',
                          meta?.color ?? 'text-zinc-600 dark:text-zinc-300'
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {meta?.label ?? 'Conversa anterior'}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {date}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm text-zinc-600 dark:text-zinc-300">
                          {item.firstUserMessage || 'Conversa sem título'}
                        </span>
                      </span>
                      <ArrowRight className="size-5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1 dark:text-zinc-500" />
                    </button>
                  )
                })}

                {error ? (
                  <p className="py-3 text-center text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : null}

                {loading ? (
                  <p className="py-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Carregando conversas…
                  </p>
                ) : null}

                {!loading && hasMore ? (
                  <div className="flex justify-center pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void fetchPage(page + 1, false)}
                      className="rounded-full bg-white/70 px-6 shadow-lg shadow-violet-950/5 hover:bg-white dark:bg-white/10 dark:hover:bg-white/15"
                    >
                      Carregar mais
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>
          </main>

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
