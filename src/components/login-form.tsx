// src/components/LoginForm.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react'
import GoogleIcon from './icons/Google'
import { useTranslation } from '@/i18n/useTranslation'
import { LanguageSwitcher } from '@/components/language-switcher'

const REMEMBER_ME_EMAIL_KEY = 'mediz_remembered_email'

export function LoginForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // estados do envio via WhatsApp
  const [sending, setSending] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)

  // Carregar email salvo quando componente monta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem(REMEMBER_ME_EMAIL_KEY)
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false
    })
    setIsLoading(false)

    if (res?.error) {
      setError(t('login.error.invalidCredentials', 'E-mail ou senha inválidos.'))
    } else {
      // Salvar ou remover email baseado no "lembrar-me"
      if (typeof window !== 'undefined') {
        if (rememberMe && email) {
          localStorage.setItem(REMEMBER_ME_EMAIL_KEY, email)
        } else {
          localStorage.removeItem(REMEMBER_ME_EMAIL_KEY)
        }

        // Limpar caches antes de login bem-sucedido para garantir dados frescos
        import('@/lib/logout-utils').then(({ clearAllCaches }) => {
          clearAllCaches()
        }).catch(() => {
          // Ignora erros de import
        })
      }
      
      // Aguarda um pouco para garantir que a sessão foi criada
      setTimeout(() => {
        router.push('/chat')
        // Força refresh da página para garantir que os dados do usuário sejam carregados
        router.refresh()
      }, 100)
    }
  }

  const handleForgotByWhatsapp = async () => {
    if (!email) {
      setError(
        t(
          'login.error.emailRequiredWhatsapp',
          'Informe seu e-mail para enviarmos o link pelo WhatsApp.'
        )
      )
      return
    }
    try {
      setSending(true)
      setError(null)
      const res = await fetch('/api/request-reset-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json().catch(() => ({}))
      setMaskedPhone(data?.maskedPhone ?? null)
      setOpenModal(true)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setMaskedPhone(null)
      setOpenModal(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-4 sm:gap-6', className)} {...props}>
      <Card className="bg-zinc-50 border-zinc-300 shadow-lg w-full">
        <CardHeader className="text-center flex flex-col items-center px-4 pt-6 sm:px-6 sm:pt-8">
          <p className="text-primary font-bold text-3xl sm:text-4xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <hr className="w-1/12 border-indigo-600 my-3 sm:my-4" />
          <p className="text-zinc-500 mb-4 sm:mb-6 text-sm sm:text-base">
            <span className="text-indigo-600">28.653</span>{' '}
            {t('login.stats', 'pessoas já usaram')}
          </p>
          <CardTitle className="text-lg sm:text-xl text-zinc-800 pt-2">
            {t('login.form.title', 'Login')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          {/* Alerta sobre primeiro acesso */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <AlertTitle className="text-blue-800 font-semibold text-xs sm:text-sm">
              {t('login.alert.firstAccess.title', 'Primeiro acesso?')}
            </AlertTitle>
            <AlertDescription className="text-blue-700 text-xs sm:text-sm mt-1">
              {t('login.alert.firstAccess.message', 'É o seu primeiro acesso?')}{' '}
              <Link
                href="/signup"
                className="underline font-medium hover:text-blue-800"
              >
                {t('login.signup.cta', 'Cadastre-se!')}
              </Link>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
            <Input
              name="email"
              type="email"
              placeholder={t('login.email', 'E-mail')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-10 sm:h-11 text-sm sm:text-base"
              required
            />
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.password', 'Senha')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-10 sm:h-11 text-sm sm:text-base pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                aria-label={t('login.password.toggle', 'Alternar visibilidade da senha')}
              >
                {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
              </button>
            </div>
            
            {/* Checkbox Lembrar-me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label
                htmlFor="rememberMe"
                className="text-xs sm:text-sm text-zinc-700 cursor-pointer select-none"
              >
                {t('login.rememberMe', 'Lembrar-me')}
              </label>
            </div>

            {error && <p className="text-red-500 text-xs sm:text-sm">{error}</p>}
            <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base" disabled={isLoading}>
              {isLoading ? t('login.button.loading', 'Entrando...') : t('login.submit', 'Entrar')}
            </Button>
          </form>

          {/* Seletor de idioma */}
          <div className="flex justify-center mt-4">
            <LanguageSwitcher showLabel={false} />
          </div>

          {/* Link/ação: Esqueci minha senha (WhatsApp) */}
          <button
            type="button"
            onClick={handleForgotByWhatsapp}
            className="w-full text-xs sm:text-sm text-indigo-600 underline hover:text-indigo-500 text-left pl-2"
            disabled={sending}
          >
            {sending
              ? t('login.forgot.whatsappSending', 'Enviando via WhatsApp…')
              : t('login.forgot.action', 'Esqueci minha senha')}
          </button>

          {/* Divider "ou" */}
          <div className="flex items-center">
            <hr className="flex-grow border-zinc-300" />
            <span className="px-2 text-xs sm:text-sm text-zinc-500">{t('login.divider.or', 'ou')}</span>
            <hr className="flex-grow border-zinc-300" />
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 sm:h-11 flex items-center justify-center gap-2 text-sm sm:text-base"
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
          >
            <GoogleIcon />
            {t('login.google', 'Continuar com Google')}
          </Button>

          <Link href="/chat?guest=1">
            <Button variant="link" className="w-full mt-2 sm:mt-4 text-xs sm:text-sm">
              {t('login.guest', 'Entrar como convidado')}
            </Button>
          </Link>

          {/* Alerta sobre recuperação de senha Google */}
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <AlertTitle className="text-yellow-800 font-semibold text-xs sm:text-sm">
              {t('login.alert.google.title', 'Atenção')}
            </AlertTitle>
            <AlertDescription className="text-yellow-700 text-xs sm:text-sm mt-1">
              {t('login.alert.google.message', 'Se você fez login com Google, a recuperação de senha deve ser feita pela sua conta Google.')}
            </AlertDescription>
          </Alert>

          <p className="text-center text-xs sm:text-sm text-zinc-600">
            {t('login.signup.prompt', 'Ainda não tem conta?')}{' '}
            <Link
              href="/signup"
              className="underline text-indigo-600 hover:text-indigo-500"
            >
              {t('login.signup.cta', 'Cadastre-se!')}
            </Link>
          </p>

          <p className="text-center text-[10px] sm:text-xs text-zinc-500 mt-2 sm:mt-4">
            {t('login.terms.notice', 'Ao clicar em qualquer opção, você concorda com nossos')}{' '}
            <a
              href="https://universidadedeterapias.com.br/termos-de-uso"
              className="underline text-indigo-600"
            >
              {t('login.terms.service', 'Termos de Serviço')}
            </a>{' '}
            {t('login.terms.and', 'e')}{' '}
            <a
              href="https://universidadedeterapias.com.br/politica-de-privacidade"
              className="underline text-indigo-600"
            >
              {t('login.terms.privacy', 'Política de Privacidade')}
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Modal de confirmação */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('login.whatsapp.modal.title', 'Confira seu WhatsApp')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-700">
            {maskedPhone ? (() => {
              const template = t(
                'login.whatsapp.modal.sent',
                'Enviamos um link de redefinição para o número com final {phone}.'
              )
              const [prefix, suffix] = template.split('{phone}')
              return (
                <>
                  {prefix}
                  <b>{maskedPhone}</b>
                  {suffix}
                </>
              )
            })() : (
              <>
                {t(
                  'login.whatsapp.modal.sentFallback',
                  'Se existir uma conta com esse e-mail, enviaremos um link de redefinição via WhatsApp.'
                )}
              </>
            )}
          </p>
          <DialogFooter>
            <Button onClick={() => setOpenModal(false)}>
              {t('general.confirm', 'Confirmar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
