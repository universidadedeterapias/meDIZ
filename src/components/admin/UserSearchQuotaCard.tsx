'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RotateCcw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type SearchQuotaStatus = {
  premium: boolean
  period: 'first-week' | 'first-month' | 'beyond-month'
  searchLimit: number
  usadasHoje: number
  feitasHoje: number
  searchQuotaResetAt: string | null
}

const ROTULO_PERIODO: Record<SearchQuotaStatus['period'], string> = {
  'first-week': 'Primeira semana',
  'first-month': 'Primeiro mês',
  'beyond-month': 'Após 30 dias'
}

type UserSearchQuotaCardProps = {
  userId: string
}

/**
 * Cota diaria de pesquisas do plano gratuito. Zerar nao apaga nenhuma
 * conversa: as pesquisas de hoje so deixam de contar (ver src/lib/search-quota.ts).
 */
export function UserSearchQuotaCard({ userId }: UserSearchQuotaCardProps) {
  const [data, setData] = useState<SearchQuotaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadQuota = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/search-quota`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha ao carregar a cota de pesquisas')
      }
      setData((await res.json()) as SearchQuotaStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a cota de pesquisas')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadQuota()
  }, [loadQuota])

  const handleReset = async () => {
    if (!confirm('Zerar a cota de pesquisas de hoje? As conversas continuam no histórico.')) return
    setResetting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/search-quota`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha ao zerar')
      }
      setData((await res.json()) as SearchQuotaStatus)
    } catch {
      alert('Não foi possível zerar a cota.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando cota de pesquisas...
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-red-600">
          {error ?? 'Cota de pesquisas indisponível'}
        </CardContent>
      </Card>
    )
  }

  const esgotada = !data.premium && data.usadasHoje >= data.searchLimit

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Pesquisas do dia
        </CardTitle>
        <CardDescription>
          Limite diário do plano gratuito. A cota vira à meia-noite do servidor
          (21h de Brasília). Zerar não apaga conversas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.premium ? (
          <p className="text-sm text-muted-foreground">
            Usuário premium: sem limite diário de pesquisas.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={esgotada ? 'destructive' : 'secondary'}>
                {data.usadasHoje} de {data.searchLimit} usadas
              </Badge>
              <span className="text-muted-foreground">
                {ROTULO_PERIODO[data.period]}
                {data.feitasHoje !== data.usadasHoje &&
                  ` · ${data.feitasHoje} feitas hoje no total`}
              </span>
            </div>

            {data.searchQuotaResetAt && (
              <p className="text-xs text-muted-foreground">
                Último reset:{' '}
                {new Date(data.searchQuotaResetAt).toLocaleString('pt-BR')}
              </p>
            )}

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetting || data.usadasHoje === 0}
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Zerar pesquisas de hoje
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
