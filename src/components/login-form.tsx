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
import { cn } from '@/lib/utils'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import GoogleIcon from './icons/Google'

export function LoginForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // estados do envio via WhatsApp
  const [sending, setSending] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)

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
      setError('E-mail ou senha inválidos.')
    } else {
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
      setError('Informe seu e-mail para enviarmos o link pelo WhatsApp.')
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
          <CardTitle className="text-xl text-zinc-800 pt-2">Login</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              name="email"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Link/ação: Esqueci minha senha (WhatsApp) */}
          <button
            type="button"
            onClick={handleForgotByWhatsapp}
            className="w-full text-sm text-indigo-600 underline hover:text-indigo-500 text-left pl-2"
            disabled={sending}
          >
            {sending ? 'Enviando via WhatsApp…' : 'Esqueci minha senha'}
          </button>

          {/* Divider “ou” */}
          <div className="flex items-center">
            <hr className="flex-grow border-zinc-300" />
            <span className="px-2 text-zinc-500">ou</span>
            <hr className="flex-grow border-zinc-300" />
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => signIn('google', { callbackUrl: '/chat' })}
          >
            <GoogleIcon />
            Continuar com Google
          </Button>

          <Link href="/chat?guest=1">
            <Button variant="link" className="w-full mt-4">
              Entrar como convidado
            </Button>
          </Link>

          <p className="text-center text-sm text-zinc-600">
            Ainda não tem conta?{' '}
            <Link
              href="/signup"
              className="underline text-indigo-600 hover:text-indigo-500"
            >
              Cadastre-se!
            </Link>
          </p>

          <p className="text-center text-xs text-zinc-500 mt-4">
            Ao clicar em qualquer opção, você concorda com nossos{' '}
            <a
              href="https://universidadedeterapias.com.br/termos-de-uso"
              className="underline text-indigo-600"
            >
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a
              href="https://universidadedeterapias.com.br/politica-de-privacidade"
              className="underline text-indigo-600"
            >
              Política de Privacidade
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Modal de confirmação */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confira seu WhatsApp</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-700">
            {maskedPhone ? (
              <>
                Enviamos um link de redefinição para o número com final{' '}
                <b>{maskedPhone}</b>.
              </>
            ) : (
              <>
                Se existir uma conta com esse e-mail, enviaremos um link de
                redefinição via WhatsApp.
              </>
            )}
          </p>
          <DialogFooter>
            <Button onClick={() => setOpenModal(false)}>Ok</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
