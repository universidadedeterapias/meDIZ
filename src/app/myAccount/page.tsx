// src/app/myAccount/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/contexts/user'
import { formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import MyAccountSkeleton from './skeleton'

type Subscription = {
  isPremium: boolean
  renewalDate: string
}

type FormValues = {
  fullName: string
  email: string
  whatsapp: string
}

export default function MyAccountPage() {
  const router = useRouter()
  const { user, setUser } = useUser()
  const [editing, setEditing] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<FormValues>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      whatsapp: user?.whatsapp ?? ''
    }
  })
  useEffect(() => {
    if (editing && user) {
      reset({
        fullName: user.fullName!,
        email: user.email,
        whatsapp: user.whatsapp!
      })
    }
  }, [editing, reset, user])

  useEffect(() => {
    // substitua pelo fetch real
    setTimeout(
      () =>
        setSubscription({
          isPremium: true,
          renewalDate: '2025-08-15'
        }),
      500
    )
  }, [])

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      const updated = await res.json()
      if (!user?.id) return
      setUser({
        ...user,
        id: user?.id,
        fullName: updated.fullName,
        email: updated.email,
        whatsapp: updated.whatsapp
      })
      setEditing(false)
    } catch (err) {
      console.error(err)
      alert('Não foi possível salvar as mudanças.')
    }
  }

  if (!user || subscription === null) {
    return <MyAccountSkeleton />
  }

  const handleCancelSubscription = () => alert('Cancelamento iniciado')
  const handleLogout = () => router.push('/login')

  return (
    <>
      <header className="w-full sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/chat" className="text-primary">
            <ArrowLeft />
          </a>
          <p className="text-primary font-bold text-2xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div>{/* Espaço à direita */}</div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Voltar para Home */}
        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Idioma</span>
            <select className="border p-1 rounded text-sm">
              <option value="pt-BR">🇧🇷 Português (BR)</option>
              <option value="en-US">🇺🇸 English (US)</option>
            </select>
          </div>
        </div>
        {/* Perfil */}
        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-4 p-4">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user.image!} alt="Foto de perfil" />
              <AvatarFallback>{user.fullName![0]}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h1 className="text-lg font-medium">{user.fullName}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </CardHeader>
        </Card>

        {/* Assinatura */}
        {subscription.isPremium && (
          <Card className="border-yellow-400 bg-yellow-50 shadow-sm text-sm border-l-4">
            <CardHeader className="space-y-1">
              <CardTitle className="text-yellow-800">
                🌟 Assinatura Premium
              </CardTitle>
              <CardDescription className="text-yellow-700/80">
                Renovação em {formatDate(subscription.renewalDate)}
              </CardDescription>
            </CardHeader>
            {/* <CardContent>
              <p className="text-gray-700">
                Obrigado por ser Premium! Tenha acesso total aos recursos.
              </p>
            </CardContent> */}
          </Card>
        )}

        <Separator />

        {/* Informações do Usuário */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center p-4">
            <CardTitle className="text-sm font-medium">Seus dados</CardTitle>
            {!editing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Editar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-4">
            {/* Nome */}
            <div>
              <Label className="text-xs">Nome</Label>
              {editing ? (
                <Input
                  {...register('fullName', { required: 'Nome é obrigatório' })}
                  className="mt-1 text-sm"
                />
              ) : (
                <p className="text-sm">{user.fullName}</p>
              )}
              {errors.fullName && (
                <p className="text-xs text-red-500">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* E-mail */}
            <div>
              <Label className="text-xs">E-mail</Label>
              {editing ? (
                <Input
                  type="email"
                  {...register('email', {
                    required: 'E-mail é obrigatório',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'E-mail inválido'
                    }
                  })}
                  className="mt-1 text-sm"
                />
              ) : (
                <p className="text-sm">{user.email}</p>
              )}
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Whatsapp */}
            <div>
              <Label className="text-xs">Whatsapp</Label>
              {editing ? (
                <Input
                  {...register('whatsapp', {
                    required: 'Whatsapp é obrigatório'
                  })}
                  className="mt-1 text-sm"
                />
              ) : (
                <p className="text-sm">{user.whatsapp}</p>
              )}
              {errors.whatsapp && (
                <p className="text-xs text-red-500">
                  {errors.whatsapp.message}
                </p>
              )}
            </div>

            {/* Botão Salvar */}
            {editing && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  Salvar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planos & Preços */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-medium">
              Planos &amp; Preços
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span>Data de Renovação:</span>
              <span className="font-bold">
                {formatDate(subscription.renewalDate)}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="transition-colors"
              >
                <Link href="/account/payments-history">
                  Ver Histórico de Pagamentos
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="transition-colors"
                onClick={handleCancelSubscription}
              >
                Cancelar Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Consulte um especialista */}
        <Button
          asChild
          className="w-full"
          variant="secondary"
          onClick={() =>
            window.open(
              'https://wa.me/5555997230707?text=%F0%9F%98%80%20Ol%C3%A1%2C%20gostaria%20de%20consultar%20um%20especialista!',
              '_blank'
            )
          }
        >
          <span>💬 Falar com especialista</span>
        </Button>
        <Separator />

        {/* Suporte */}
        <Button
          size="sm"
          className="w-full  bg-green-500 text-white hover:bg-green-600"
          onClick={() => window.open('https://wa.me/+5555997230707', '_blank')}
        >
          <FaWhatsapp />
          Suporte via WhatsApp
        </Button>

        {/* Logout */}
        <Button
          size="sm"
          className="w-full bg-red-100 text-red-700 hover:bg-red-200"
          onClick={handleLogout}
        >
          Sair
        </Button>
      </div>
    </>
  )
}
