'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { buildWhatsAppCredentialsMessage } from '@/lib/whatsappCredentialsTemplate'
import { Copy, RefreshCw, Check, KeyRound } from 'lucide-react'

type PendingItem = {
  user_id: string
  nome: string
  email: string
  temporary_password: string
  created_at: string
  permissoes: {
    audioterapia: boolean
    pdf: boolean
    livro_digital: boolean
  }
}

function formatPermissoes(permissoes: PendingItem['permissoes']) {
  const parts: string[] = []
  if (permissoes.audioterapia) parts.push('Audio')
  if (permissoes.pdf) parts.push('PDF')
  if (permissoes.livro_digital) parts.push('Livro Digital')
  return parts.length ? parts.join(' + ') : '—'
}

export default function ClientesPendentesPage() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/biblioteca/pending-credentials', {
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('fetch_failed')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const handleCopyMessage = (item: PendingItem) => {
    const msg = buildWhatsAppCredentialsMessage({
      nome: item.nome,
      email: item.email,
      senha: item.temporary_password
    })
    copyText(msg)
  }

  const handleMarkSent = async (userId: string) => {
    setActionId(userId)
    try {
      const res = await fetch(
        `/api/admin/biblioteca/pending-credentials/${userId}/mark-sent`,
        { method: 'POST' }
      )
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.user_id !== userId))
      }
    } finally {
      setActionId(null)
    }
  }

  const handleRegenerate = async (item: PendingItem) => {
    if (
      !window.confirm(
        'Tem certeza? A senha anterior deixará de funcionar.'
      )
    ) {
      return
    }
    setActionId(item.user_id)
    try {
      const res = await fetch(
        `/api/admin/biblioteca/pending-credentials/${item.user_id}/regenerate`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (res.ok && data.temporary_password) {
        setItems((prev) =>
          prev.map((i) =>
            i.user_id === item.user_id
              ? { ...i, temporary_password: data.temporary_password }
              : i
          )
        )
      }
    } finally {
      setActionId(null)
    }
  }

  const renderActions = (item: PendingItem) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button
        size="sm"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={actionId === item.user_id}
        onClick={() => handleCopyMessage(item)}
      >
        <Copy className="mr-1 h-3 w-3" />
        Copiar mensagem
      </Button>
      <Button
        size="sm"
        className="w-full sm:w-auto"
        disabled={actionId === item.user_id}
        onClick={() => handleMarkSent(item.user_id)}
      >
        <Check className="mr-1 h-3 w-3" />
        Marcar enviado
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={actionId === item.user_id}
        onClick={() => handleRegenerate(item)}
      >
        <KeyRound className="mr-1 h-3 w-3" />
        Regenerar
      </Button>
    </div>
  )

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Clientes pendentes — Biblioteca
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Credenciais para envio manual via WhatsApp
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full shrink-0 sm:w-auto"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nenhum cliente pendente de envio.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <article
                key={item.user_id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <p className="font-medium text-foreground">{item.nome}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">{item.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{item.temporary_password}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => copyText(item.temporary_password)}
                    aria-label="Copiar senha"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Conteúdos</dt>
                    <dd>{formatPermissoes(item.permissoes)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Comprou</dt>
                    <dd>
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 border-t pt-4">{renderActions(item)}</div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Nome</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Senha temporária</th>
                  <th className="p-3 text-left font-medium">Conteúdos comprados</th>
                  <th className="p-3 text-left font-medium">Comprou em</th>
                  <th className="p-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.user_id} className="border-b last:border-0">
                    <td className="p-3">{item.nome}</td>
                    <td className="max-w-[200px] break-all p-3">{item.email}</td>
                    <td className="p-3 font-mono">
                      <span className="mr-2">{item.temporary_password}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyText(item.temporary_password)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="p-3">{formatPermissoes(item.permissoes)}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </td>
                    <td className="p-3">{renderActions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
