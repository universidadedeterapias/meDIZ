// src/components/SignupForm.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import GoogleIcon from './icons/Google'
import { useTranslation } from '@/i18n/useTranslation'

type SignupData = {
  email: string
  password: string
  confirm: string
  whatsapp: string
}

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const signupSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t('signup.errors.email', 'E-mail inválido')),
          password: z
            .string()
            .min(6, t('signup.errors.passwordLength', 'Senha deve ter pelo menos 6 caracteres')),
          confirm: z.string(),
          whatsapp: z
            .string()
            .min(10, t('signup.errors.whatsappLength', 'WhatsApp deve ter pelo menos 10 dígitos'))
        })
        .refine(data => data.password === data.confirm, {
          path: ['confirm'],
          message: t('signup.errors.passwordMismatch', 'As senhas não coincidem')
        }),
    [t]
  )

  const form = useForm<SignupData>({
    // @ts-expect-error - zodResolver type inference issue with refine
    resolver: zodResolver(signupSchema)
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = form

  const onSubmit = async (data: SignupData) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        whatsapp: data.whatsapp
      })
    })

    const result = await res.json()

    if (!res.ok) {
      alert(result.error || t('signup.error.generic', 'Erro ao cadastrar'))
      return
    }

    if (result.whatsappSent) {
      router.push(`/confirm-signup?email=${encodeURIComponent(data.email)}&sent=true`)
    } else {
      router.push(`/verify-whatsapp?email=${encodeURIComponent(data.email)}`)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="bg-zinc-50 border-zinc-300 shadow-lg">
        <CardHeader className="text-center flex flex-col items-center">
          <p className="text-primary font-bold text-4xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <hr className="w-1/12 border-indigo-600 my-4" />
          <p className="text-zinc-500 mb-6">
            <span className="text-indigo-600">12.460</span>{' '}
            {t('signup.stats', 'pessoas já usaram')}
          </p>
          <CardTitle className="text-xl text-zinc-800 pt-2">
            {t('signup.form.title', 'Cadastre-se')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col gap-4">
            <div>
              <Input {...register('email')} type="email" placeholder={t('signup.email', 'E-mail')} />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Input
                {...register('whatsapp')}
                type="tel"
                placeholder={t('signup.whatsapp.placeholder', 'WhatsApp (ex: 11999999999)')}
              />
              {errors.whatsapp && (
                <p className="text-red-500 text-sm mt-1">{errors.whatsapp.message}</p>
              )}
            </div>

            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('signup.password', 'Senha')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={t('signup.password.toggle', 'Alternar visibilidade da senha')}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="relative">
              <Input
                {...register('confirm')}
                type={showConfirm ? 'text' : 'password'}
                placeholder={t('signup.confirmPassword', 'Confirme a senha')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={t('signup.confirmPassword.toggle', 'Alternar visibilidade da confirmação')}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.confirm && (
                <p className="text-red-500 text-sm mt-1">{errors.confirm.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('signup.button.loading', 'Cadastrando...') : t('signup.submit', 'Cadastrar')}
            </Button>
          </form>

          <div className="flex items-center">
            <hr className="flex-grow border-zinc-300" />
            <span className="px-2 text-zinc-500">{t('signup.divider.or', 'ou')}</span>
            <hr className="flex-grow border-zinc-300" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
          >
            <GoogleIcon />
            {t('signup.google', 'Continuar com Google')}
          </Button>

          <p className="text-center text-sm text-zinc-600">
            {t('signup.login.prompt', 'Já possui conta?')}{' '}
            <Link href="/login" className="underline text-indigo-600 hover:text-indigo-500">
              {t('signup.login.cta', 'Faça login!')}
            </Link>
          </p>

          <p className="text-center text-xs text-zinc-500 mt-4">
            {t('signup.terms.notice', 'Ao clicar em qualquer opção, você concorda com nossos')}{' '}
            <a href="#" className="underline text-indigo-600">
              {t('signup.terms.service', 'Termos de Serviço')}
            </a>{' '}
            {t('signup.terms.and', 'e')}{' '}
            <a href="#" className="underline text-indigo-600">
              {t('signup.terms.privacy', 'Política de Privacidade')}
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
