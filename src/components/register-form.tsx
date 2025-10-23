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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import GoogleIcon from './icons/Google'

// 1) Defina seu schema Zod de validação
const signupSchema = z
  .object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirm: z.string(),
    whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
  })
  .refine(data => data.password === data.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem'
  })

type SignupData = z.infer<typeof signupSchema>

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  // 2) Estados para controlar visibilidade das senhas
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  // 3) Hook do React-Hook-Form com Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema)
  })

  // 4) Função que roda no client ao submeter
  const onSubmit = async (data: SignupData) => {
    // chama sua rota de signup
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
      alert(result.error || 'Erro ao cadastrar')
      return
    }
    
    // Se WhatsApp foi enviado automaticamente, ir direto para confirmação
    if (result.whatsappSent) {
      router.push(`/confirm-signup?email=${encodeURIComponent(data.email)}&sent=true`)
    } else {
      // Senão, ir para página de verificação WhatsApp
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
            <span className="text-indigo-600">12.460</span> pessoas já usaram
          </p>
          <CardTitle className="text-xl text-zinc-800 pt-2">
            Cadastre-se
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Form de e-mail + senha + confirmar senha */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Email */}
            <div>
              <Input {...register('email')} type="email" placeholder="E-mail" />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <Input {...register('whatsapp')} type="tel" placeholder="WhatsApp (ex: 11999999999)" />
              {errors.whatsapp && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.whatsapp.message}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirmar senha */}
            <div className="relative">
              <Input
                {...register('confirm')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirme a senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.confirm && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirm.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>

          {/* Divider “ou” */}
          <div className="flex items-center">
            <hr className="flex-grow border-zinc-300" />
            <span className="px-2 text-zinc-500">ou</span>
            <hr className="flex-grow border-zinc-300" />
          </div>

          {/* Continuar com Google */}

          <Button
            type="submit"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
          >
            <GoogleIcon />
            Continuar com Google
          </Button>

          {/* Link para voltar ao login */}
          <p className="text-center text-sm text-zinc-600">
            Já possui conta?{' '}
            <Link
              href="/login"
              className="underline text-indigo-600 hover:text-indigo-500"
            >
              Faça login!
            </Link>
          </p>

          {/* Termos de serviço */}
          <p className="text-center text-xs text-zinc-500 mt-4">
            Ao clicar em qualquer opção, você concorda com nossos{' '}
            <a href="#" className="underline text-indigo-600">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="#" className="underline text-indigo-600">
              Política de Privacidade
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
