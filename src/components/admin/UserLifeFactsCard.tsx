'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, HeartPulse, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type LifeFact = {
  id: string
  type: string
  fact: string
  category: string | null
  status: string
  approach: string
  sensitivity: string
  confidence: number | null
  relevance: number
  evidence: string | null
  createdAt: string
  lastMentionedAt: string
  resolvedAt: string | null
}

type LifeFactsResponse = {
  lifeCompact: string | null
  lastConversationAt: string | null
  lastTopic: string | null
  facts: LifeFact[]
}

type UserLifeFactsCardProps = {
  userId: string
}

export function UserLifeFactsCard({ userId }: UserLifeFactsCardProps) {
  const [data, setData] = useState<LifeFactsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadFacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/life-facts`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha ao carregar fatos de vida')
      }
      setData((await res.json()) as LifeFactsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fatos de vida')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadFacts()
  }, [loadFacts])

  const handleForget = async (factId: string) => {
    if (!confirm('Apagar este fato? Não dá pra desfazer.')) return
    setDeletingId(factId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/life-facts/${factId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Falha ao apagar')
      setData((prev) => (prev ? { ...prev, facts: prev.facts.filter((f) => f.id !== factId) } : prev))
    } catch {
      alert('Não foi possível apagar o fato.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fatos de vida...
        </CardContent>
      </Card>
    )
  }

  const markers = data?.facts.filter((f) => f.type === 'marker') ?? []
  const ongoing = data?.facts.filter((f) => f.type === 'ongoing') ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5" />
          ID Vida
        </CardTitle>
        <CardDescription>Marcos e fios abertos extraídos das conversas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!data || data.facts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum fato de vida registrado ainda.
          </p>
        ) : (
          <>
            {data.lifeCompact ? (
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Resumo para o assistente (vida_compacto)
                </p>
                <p className="whitespace-pre-line text-sm text-foreground">{data.lifeCompact}</p>
                {data.lastConversationAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Última conversa: {new Date(data.lastConversationAt).toLocaleString('pt-BR')}
                    {data.lastTopic ? ` — ${data.lastTopic}` : ''}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Há fatos registrados, mas o resumo (vida_compacto) ainda não foi condensado.
              </p>
            )}

            {[
              { label: `Marcos (${markers.length})`, list: markers },
              { label: `Fios abertos (${ongoing.length})`, list: ongoing }
            ].map(({ label, list }) =>
              list.length > 0 ? (
                <div key={label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                  <div className="space-y-2">
                    {list.map((fact) => (
                      <div
                        key={fact.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border/80 p-2.5"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm text-foreground">{fact.fact}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[11px]">
                              {fact.status}
                            </Badge>
                            {fact.category ? (
                              <Badge variant="outline" className="text-[11px]">
                                {fact.category}
                              </Badge>
                            ) : null}
                            {fact.sensitivity === 'high' ? (
                              <Badge variant="destructive" className="text-[11px]">
                                sensível
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-destructive"
                          disabled={deletingId === fact.id}
                          onClick={() => handleForget(fact.id)}
                          aria-label="Esquecer este fato"
                        >
                          {deletingId === fact.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
