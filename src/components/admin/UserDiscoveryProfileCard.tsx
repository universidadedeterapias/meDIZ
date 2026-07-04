'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DiscoveryAttribute = {
  value: unknown
  confidence?: number
}

type DiscoveryProfileResponse = {
  exists: boolean
  extracted?: boolean
  discoveryCompleted?: boolean
  consentedAt?: string | null
  usageContext?: string | null
  preferredStyle?: string | null
  core?: Record<string, DiscoveryAttribute> | null
  dynamics?: Record<string, DiscoveryAttribute> | null
  predictive?: Record<string, DiscoveryAttribute> | null
  compactProfile?: string | null
  updatedAt?: string
}

type UserDiscoveryProfileCardProps = {
  userId: string
}

function formatAttributeLayer(layer: Record<string, DiscoveryAttribute> | null | undefined) {
  if (!layer) return []
  return Object.entries(layer)
    .filter(([, attribute]) => attribute?.value !== null && attribute?.value !== undefined)
    .map(([key, attribute]) => ({
      key,
      value: Array.isArray(attribute.value) ? attribute.value.join(', ') : String(attribute.value)
    }))
}

export function UserDiscoveryProfileCard({ userId }: UserDiscoveryProfileCardProps) {
  const [profile, setProfile] = useState<DiscoveryProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/discovery-profile`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Falha ao carregar perfil de descoberta')
      }
      setProfile((await res.json()) as DiscoveryProfileResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil de descoberta')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando perfil de descoberta...
        </CardContent>
      </Card>
    )
  }

  const coreEntries = formatAttributeLayer(profile?.core)
  const dynamicsEntries = formatAttributeLayer(profile?.dynamics)
  const predictiveEntries = formatAttributeLayer(profile?.predictive)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Descoberta
        </CardTitle>
        <CardDescription>
          Perfil captado na conversa de onboarding por voz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!profile?.exists ? (
          <p className="text-sm text-muted-foreground">
            Esta pessoa ainda não passou pela descoberta.
          </p>
        ) : !profile.extracted ? (
          <div className="space-y-2">
            <Badge variant="secondary">Descoberta concluída</Badge>
            <p className="text-sm text-muted-foreground">
              A extração do perfil ainda está pendente de processamento.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Descoberta concluída</Badge>
              {profile.usageContext ? (
                <Badge variant="outline">
                  {profile.usageContext === 'personal' ? 'Uso pessoal' : 'Uso profissional'}
                </Badge>
              ) : null}
              {profile.preferredStyle ? (
                <Badge variant="outline">
                  Estilo: {profile.preferredStyle === 'direct'
                    ? 'direto'
                    : profile.preferredStyle === 'supportive'
                      ? 'acolhedor'
                      : 'equilibrado'}
                </Badge>
              ) : null}
            </div>

            {profile.compactProfile ? (
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Resumo para o assistente
                </p>
                <p className="text-sm text-foreground">{profile.compactProfile}</p>
              </div>
            ) : null}

            {[
              { label: 'Núcleo', entries: coreEntries },
              { label: 'Dinâmica', entries: dynamicsEntries },
              { label: 'Preditivo', entries: predictiveEntries }
            ].map(({ label, entries }) =>
              entries.length > 0 ? (
                <div key={label}>
                  <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {entries.map((entry) => (
                      <Badge key={entry.key} variant="outline" className="text-[11px]">
                        {entry.key}: {entry.value}
                      </Badge>
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
