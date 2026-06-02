'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'

const API_RESET_URL = '/api/reset-password' // ajuste se estiver diferente

function scorePassword(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

export default function ResetFormClient() {
  const { t } = useTranslation()
  const params = useSearchParams()
  const router = useRouter()

  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    if (!email || !token) {
      setErr(t('reset.error.invalidLink', 'Link inválido. Solicite um novo reset.'))
    }
  }, [email, token, t])

  const strength = useMemo(() => scorePassword(password), [password])
  const passwordOk =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  const canSubmit =
    !!email && !!token && passwordOk && password === confirm && !submitting

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch(API_RESET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password })
      })

      if (res.ok) {
        // Limpar token da URL após sucesso (segurança)
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('token')
          window.history.replaceState({}, '', url.toString())
        }
        setMsg(t('reset.success', 'Senha alterada com sucesso! Redirecionando para o login…'))
        setTimeout(() => router.push('/login'), 1500)
      } else {
        const data = await res.json().catch(() => ({}))
        setErr(
          data?.error ?? t('reset.error.generic', 'Não foi possível redefinir a senha. Tente novamente.')
        )
      }
    } catch {
      setErr(t('reset.error.network', 'Falha de rede ao enviar sua solicitação.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">
          {t('reset.title', 'Definir nova senha')}
        </h1>
        <p className="text-sm text-zinc-600 mb-6">
          {email ? (
            <>
              {t('reset.subtitle.account', 'Para a conta')} <b>{email}</b>
            </>
          ) : (
            t('reset.subtitle.default', 'Informe uma nova senha.')
          )}
        </p>

        {!ready ? (
          <p>{t('reset.loading', 'Carregando…')}</p>
        ) : err && !msg ? (
          <>
            <p className="text-sm text-red-600 mb-4">{err}</p>
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="outline">
                  {t('reset.backToLogin', 'Voltar ao login')}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('reset.password.label', 'Nova senha')}
              </label>
              <div className="flex gap-2">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('reset.password.placeholder', 'Mínimo 8 caracteres')}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPw(s => !s)}
                >
                  {showPw
                    ? t('reset.password.hide', 'Ocultar')
                    : t('reset.password.show', 'Mostrar')}
                </Button>
              </div>

              <div className="h-2 bg-zinc-200 rounded">
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
              <ul className="text-xs text-zinc-600 list-disc ml-4 mt-1">
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
                onChange={e => setConfirm(e.target.value)}
                required
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-red-600">
                  {t('reset.confirm.mismatch', 'As senhas não conferem.')}
                </p>
              )}
            </div>

            {msg && <p className="text-sm text-emerald-600">{msg}</p>}
            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                {submitting
                  ? t('reset.submit.loading', 'Salvando…')
                  : t('reset.submit', 'Salvar nova senha')}
              </Button>
              <Link href="/login">
                <Button type="button" variant="outline">
                  {t('reset.cancel', 'Cancelar')}
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
