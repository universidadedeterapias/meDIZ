'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'
import { SimpleAppHeader } from '@/components/navigation/SimpleAppHeader'

function scorePassword(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

type WelcomeProduct = {
  id: string
  title: string
  cover_image_url: string | null
}

/** Para onde ir quando ninguem disse. */
const FALLBACK_DESTINATION = '/chat'

function TrocarSenhaInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [products, setProducts] = useState<WelcomeProduct[]>([])

  // `next` vem da URL, entao so caminho interno: nunca pode virar redirect para
  // fora do dominio.
  const nextParam = searchParams.get('next')
  const destination =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : FALLBACK_DESTINATION

  const strength = useMemo(() => scorePassword(password), [password])
  const passwordOk =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  const canSubmit = passwordOk && password === confirm && !submitting

  const destaque = products[0]

  // Boa parte dos compradores nao sabia que o produto seria entregue pelo meDIZ.
  // Mostrar aqui o que ela acabou de comprar transforma este gate em confirmacao
  // de que ela chegou no lugar certo.
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    void (async () => {
      try {
        const res = await apiFetch('/api/me/welcome')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data?.products)) {
          setProducts(data.products as WelcomeProduct[])
        }
      } catch {
        // Sem o produto a tela continua funcionando, so perde o contexto.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status])

  if (status === 'unauthenticated') {
    router.replace('/login')
    return null
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setErr(null)
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm })
      })

      if (res.ok) {
        router.replace(destination)
      } else {
        const data = await res.json().catch(() => ({}))
        setErr(
          data?.error ?? t('changePassword.error', 'Não foi possível alterar a senha.')
        )
      }
    } catch {
      setErr(t('changePassword.error', 'Não foi possível alterar a senha.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SimpleAppHeader backFallback={destination} />
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-3 py-6 dark:from-indigo-950/40 dark:to-purple-950/30 sm:min-h-[calc(100dvh-4rem)] sm:px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          {destaque ? (
            <div className="mb-5 flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
              {destaque.cover_image_url ? (
                // <img> e nao next/image de proposito: `coverImageUrl` e campo
                // livre no admin, e next/image lanca erro em runtime se o host
                // nao estiver em `remotePatterns`. Aqui e uma miniatura — a
                // otimizacao nao compensa derrubar a tela de primeiro acesso.
                <img
                  src={destaque.cover_image_url}
                  alt=""
                  width={48}
                  height={68}
                  className="h-[68px] w-12 shrink-0 rounded object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {t('changePassword.product.label', 'Seu acesso está liberado')}
                </p>
                <p className="truncate text-sm font-semibold">
                  {destaque.title}
                </p>
                {products.length > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('changePassword.product.more', 'e mais')}{' '}
                    {products.length - 1}{' '}
                    {products.length - 1 === 1
                      ? t('changePassword.product.moreOne', 'item')
                      : t('changePassword.product.moreMany', 'itens')}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <h1 className="text-xl font-semibold sm:text-2xl">
            {destaque
              ? t('changePassword.titleWelcome', 'Crie sua senha para entrar')
              : t('changePassword.title', 'Defina sua nova senha')}
          </h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            {destaque
              ? t(
                  'changePassword.subtitleWelcome',
                  'Você entrou pelo link que enviamos. Escolha uma senha para voltar quando quiser.'
                )
              : t(
                  'changePassword.subtitle',
                  'Por segurança, escolha uma senha pessoal para continuar usando o meDIZ.'
                )}
          </p>

          {status === 'loading' ? (
            <p>{t('reset.loading', 'Carregando…')}</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('reset.password.label', 'Nova senha')}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('reset.password.placeholder', 'Mínimo 8 caracteres')}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw
                      ? t('reset.password.hide', 'Ocultar')
                      : t('reset.password.show', 'Mostrar')}
                  </Button>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-2 rounded transition-all"
                    style={{
                      width: `${(strength / 4) * 100}%`,
                      backgroundColor:
                        strength <= 1
                          ? '#ef4444'
                          : strength === 2
                            ? '#f59e0b'
                            : '#10b981'
                    }}
                  />
                </div>
                <ul className="ml-4 mt-1 list-disc text-xs text-muted-foreground">
                  <li>{t('reset.password.requirements.min', 'Mínimo 8 caracteres')}</li>
                  <li>
                    {t(
                      'reset.password.requirements.chars',
                      'Letra maiúscula, minúscula e número'
                    )}
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('reset.confirm.label', 'Confirmar nova senha')}
                </label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-600">
                    {t('reset.confirm.mismatch', 'As senhas não conferem.')}
                  </p>
                )}
              </div>

              {err && <p className="text-sm text-red-600">{err}</p>}

              <Button type="submit" disabled={!canSubmit} className="w-full">
                {submitting
                  ? t('changePassword.saving', 'Salvando…')
                  : destaque
                    ? t('changePassword.submitWelcome', 'Salvar e ver meu acesso')
                    : t('changePassword.submit', 'Salvar e continuar')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

export default function TrocarSenhaPage() {
  return (
    <Suspense fallback={null}>
      <TrocarSenhaInner />
    </Suspense>
  )
}
