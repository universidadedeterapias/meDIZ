'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Loader2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ProductRow = {
  id: string
  title: string
  granted: boolean
  source: string | null
  revocable: boolean
}

type CategoryRow = {
  key: string
  label: string
  products: ProductRow[]
}

type BonusSnapshot = {
  permissoes: {
    audioterapia: boolean
    pdf: boolean
    livro_digital: boolean
  }
  categories: CategoryRow[]
}

function sourceLabel(source: string | null): string | null {
  if (!source) return null
  switch (source) {
    case 'manual':
      return 'Manual'
    case 'hotmart':
      return 'Hotmart'
    case 'stone':
      return 'Stone'
    case 'migration':
      return 'Migração'
    case 'library_permissions_api':
      return 'API biblioteca'
    default:
      return source
  }
}

type UserBonusAccessCardProps = {
  userId: string
}

export function UserBonusAccessCard({ userId }: UserBonusAccessCardProps) {
  const [snapshot, setSnapshot] = useState<BonusSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingGrants, setPendingGrants] = useState<Set<string>>(new Set())
  const [pendingRevokes, setPendingRevokes] = useState<Set<string>>(new Set())

  const loadBonuses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/bonuses`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Falha ao carregar bônus')
      }
      const data = (await res.json()) as BonusSnapshot
      setSnapshot(data)
      setPendingGrants(new Set())
      setPendingRevokes(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar bônus')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadBonuses()
  }, [loadBonuses])

  const isChecked = (product: ProductRow) => {
    if (pendingRevokes.has(product.id)) return false
    if (pendingGrants.has(product.id)) return true
    return product.granted
  }

  const toggleProduct = (product: ProductRow, checked: boolean) => {
    setSuccess(null)

    if (checked) {
      setPendingRevokes((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
      if (!product.granted) {
        setPendingGrants((prev) => new Set(prev).add(product.id))
      }
      return
    }

    setPendingGrants((prev) => {
      const next = new Set(prev)
      next.delete(product.id)
      return next
    })

    if (product.granted && product.revocable) {
      setPendingRevokes((prev) => new Set(prev).add(product.id))
    }
  }

  const handleSave = async () => {
    const grantProductIds = [...pendingGrants]
    const revokeProductIds = [...pendingRevokes]

    if (grantProductIds.length === 0 && revokeProductIds.length === 0) {
      setError('Marque produtos para liberar ou desmarque os que deseja revogar.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}/bonuses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantProductIds, revokeProductIds })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? 'Falha ao atualizar bônus')
      }

      setSnapshot({
        permissoes: data.permissoes,
        categories: data.categories ?? snapshot?.categories ?? []
      })
      setPendingGrants(new Set())
      setPendingRevokes(new Set())

      const parts: string[] = []
      if (data.granted > 0) {
        parts.push(`${data.granted} produto(s) liberado(s)`)
      }
      if (data.revoked > 0) {
        parts.push(`${data.revoked} produto(s) revogado(s)`)
      }
      setSuccess(parts.join(' · ') || 'Acesso atualizado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar bônus')
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = pendingGrants.size + pendingRevokes.size

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando bônus...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Bônus e produtos
        </CardTitle>
        <CardDescription>
          Libere ou revogue acesso a produtos específicos por categoria
          (audioterapia, PDF, livro digital e cursos).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Resumo por categoria</p>
          <div className="flex flex-wrap gap-2">
            {(snapshot?.categories ?? []).map((category) => {
              const grantedCount = category.products.filter((p) => p.granted).length
              const total = category.products.length
              return (
                <Badge key={category.key} variant={grantedCount > 0 ? 'default' : 'outline'}>
                  {category.label}: {grantedCount}/{total}
                </Badge>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          {(snapshot?.categories ?? []).map((category) => (
            <div
              key={category.key}
              className="rounded-lg border border-border/80 bg-muted/20 p-4"
            >
              <p className="mb-3 text-sm font-semibold text-foreground">
                {category.label}
              </p>

              {category.products.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum produto ativo nesta categoria.
                </p>
              ) : (
                <div className="space-y-2">
                  {category.products.map((product) => {
                    const checked = isChecked(product)
                    const locked =
                      product.granted && !product.revocable && !pendingRevokes.has(product.id)
                    const disabled = locked

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          'flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/80 px-3 py-2',
                          locked && 'opacity-90'
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) =>
                              toggleProduct(product, value === true)
                            }
                          />
                          <div className="min-w-0">
                            <Label
                              htmlFor={`product-${product.id}`}
                              className={cn(
                                'block cursor-pointer leading-snug',
                                disabled && 'cursor-not-allowed text-muted-foreground'
                              )}
                            >
                              {product.title}
                            </Label>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {product.granted ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Liberado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  Bloqueado
                                </Badge>
                              )}
                              {product.source ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {sourceLabel(product.source)}
                                </Badge>
                              ) : null}
                              {locked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Lock className="h-3 w-3" />
                                  Não revogável aqui
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
        ) : null}

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || pendingCount === 0}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            `Salvar alterações${pendingCount > 0 ? ` (${pendingCount})` : ''}`
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
