// src/app/myAccount/page.tsx
'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/contexts/user'
import { formatPhone } from '@/lib/formatPhone'
import { formatCpfDisplay, formatCpfInput, isValidCpf } from '@/lib/cpf'
import { formatDate } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { AppearanceSettings } from '@/components/AppearanceSettings'
import { SimpleAppHeader } from '@/components/navigation/SimpleAppHeader'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FaWhatsapp } from 'react-icons/fa'
import MyAccountSkeleton from './skeleton'
import { useTranslation } from '@/i18n/useTranslation'
import { useLanguage } from '@/i18n/useLanguage'
import { getUpgradeLink } from '@/lib/upgradeLinks'

type SubscriptionAPI = {
  status: string
  currentPeriodEnd: string | null
  hasPremiumAccess?: boolean
}

type FormValues = {
  fullName: string
  email: string
  whatsapp: string
  cpf: string
}

export default function MyAccountPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, setUser } = useUser()
  const { t } = useTranslation()
  const { language } = useLanguage()

  const [editing, setEditing] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionAPI | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<FormValues>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      whatsapp: user?.whatsapp ?? '',
      cpf: user?.cpf ? formatCpfDisplay(user.cpf) : ''
    }
  })

  useEffect(() => {
    if (editing && user) {
      reset({
        fullName: user.fullName!,
        email: user.email,
        whatsapp: user.whatsapp!,
        cpf: user.cpf ? formatCpfDisplay(user.cpf) : ''
      })
    }
  }, [editing, reset, user])

  useEffect(() => {
    if (!user?.id) return
    fetch('/api/stripe/subscription')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao carregar assinatura')
        return res.json() as Promise<SubscriptionAPI>
      })
      .then(setSubscription)
      .catch(() =>
        setSubscription({
          status: 'canceled',
          currentPeriodEnd: null,
          hasPremiumAccess: false
        })
      )
  }, [user?.id])

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      const updated = await res.json()
      setUser(u =>
        u
          ? {
              ...u,
              fullName: updated.fullName,
              email: updated.email,
              whatsapp: updated.whatsapp,
              cpf: updated.cpf ?? null
            }
          : u
      )
      setEditing(false)
    } catch {
      alert(t('account.data.saveError', 'Não foi possível salvar as mudanças.'))
    }
  }

  if (!user || subscription === null) {
    return <MyAccountSkeleton />
  }

  const { status, currentPeriodEnd, hasPremiumAccess } = subscription
  const statusLower = status.toLowerCase()
  const hasPremium =
    hasPremiumAccess === true ||
    (hasPremiumAccess === undefined &&
      !!currentPeriodEnd &&
      new Date(currentPeriodEnd) > new Date() &&
      [
        'active',
        'trialing',
        'cancel_at_period_end',
        'past_due',
        'paused',
        'canceled',
        'cancelled'
      ].includes(statusLower))
  const isActiveStripe =
    statusLower === 'active' || statusLower === 'trialing'
  const isCancelling = statusLower === 'cancel_at_period_end'
  const isCanceledWithGrace =
    hasPremium &&
    (statusLower === 'canceled' || statusLower === 'cancelled')
  const renewDate = currentPeriodEnd

  const handleMenuSelect = (action: 'view' | 'change') => {
    if (action === 'view') setIsDialogOpen(true)
    else fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('Upload falhou')
      const { image } = await res.json()
      setUser(u => (u ? { ...u, image } : u))
    } catch {
      alert(t('account.avatar.uploadError', 'Erro ao enviar a imagem'))
    }
  }

  const handleCancelSubscription = async () => {
    if (!isActiveStripe || isCancelling || isCanceledWithGrace) return
    const msg = renewDate
      ? t('account.subscription.cancelConfirm', 'Cancelar ao fim do ciclo (até {date})?').replace('{date}', formatDate(renewDate) ?? '')
      : t('account.subscription.cancelConfirmNoDate', 'Cancelar sua assinatura?')
    if (!confirm(msg)) return

    const res = await fetch('/api/stripe/subscription/cancel', {
      method: 'PATCH'
    })
    if (!res.ok) {
      alert(t('account.subscription.cancelError', 'Falha ao agendar cancelamento.'))
      return
    }
    alert(t('account.subscription.cancelSuccess', 'Cancelamento agendado!'))
    setSubscription(s =>
      s ? { ...s, status: 'cancel_at_period_end', hasPremiumAccess: true } : s
    )
  }

  const handleLogout = async () => {
    // Limpar todos os caches ANTES do logout
    const { clearAllCaches } = await import('@/lib/logout-utils')
    clearAllCaches()
    
    // Fazer logout
    await signOut({ redirect: false })
    
    // Forçar refresh completo da página
    router.refresh()
    
    // Redirecionar para login
    router.push('/login')
    
    // Forçar reload completo após um pequeno delay
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }
  return (
    <>
      <SimpleAppHeader backFallback="/chat" />

      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:space-y-6 sm:p-4">
        {/* Perfil */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-14 h-14 cursor-pointer">
                  <AvatarImage src={user.image!} alt="Foto de perfil" />
                  <AvatarFallback>{user.fullName![0]}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => handleMenuSelect('view')}>
                  {t('account.avatar.view', 'Ver imagem')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleMenuSelect('change')}>
                  {t('account.avatar.change', 'Alterar imagem')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <div className="flex-1 text-center">
              <h1 className="text-lg font-medium">{user.fullName}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">
              {t('language.selector.label', 'Idioma')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('language.section.hint', 'Idioma da interface do aplicativo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <AppearanceSettings />
          </CardContent>
        </Card>

        {/* Cartão de Assinatura / Oferta */}
        {hasPremium ? (
          <Card className="border-yellow-400 bg-yellow-50 shadow-sm text-sm border-l-4">
            <CardHeader className="space-y-1">
              <CardTitle className="text-yellow-800">
                {t('account.subscription.premium', '🌟 Assinatura Premium')}
              </CardTitle>
              <CardDescription className="text-yellow-700/80">
                {isCancelling
                  ? `${t('account.subscription.cancelling', 'Cancelamento agendado para')} ${formatDate(renewDate!)}`
                  : isCanceledWithGrace && renewDate
                    ? `${t('account.subscription.accessUntil', 'Acesso Premium até')} ${formatDate(renewDate)}`
                    : `${t('account.subscription.renewal', 'Renovação em')} ${formatDate(renewDate!)}`}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-l-8 border-yellow-400 bg-gradient-to-r from-yellow-100 to-yellow-50 shadow-lg ">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold text-yellow-800">
                {t('account.subscription.unlock', '🔑 Assinatura Premium')}
              </CardTitle>
              <CardDescription className="text-yellow-700">
                {t('account.subscription.unlockDescription', 'Desbloqueie todos os recursos Premium e eleve sua experiência!')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="secondary"
                size="lg"
                className="w-full tracking-wide bg-yellow-400 text-yellow-900"
                onClick={() => {
                  const upgradeLink = getUpgradeLink(language)
                  window.open(upgradeLink, '_blank')
                }}
              >
                {t('account.subscription.subscribeNow', 'Assine Agora 🚀')}
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Dados do Usuário */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-medium">{t('account.data.title', 'Seus dados')}</CardTitle>
            {!editing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                {t('account.data.edit', 'Editar')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={isSubmitting}
              >
                {t('account.data.cancel', 'Cancelar')}
              </Button>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-4">
            {/* Nome */}
            <div>
              <Label className="text-xs">{t('account.data.fullName', 'Nome completo')}</Label>
              {editing ? (
                <Input
                  {...register('fullName', {
                    required: 'Nome é obrigatório'
                  })}
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
              <Label className="text-xs">{t('account.data.email', 'E-mail')}</Label>
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

            {/* CPF */}
            <div>
              <Label className="text-xs">
                {t('account.data.cpf', 'CPF')}
              </Label>
              {editing ? (
                <Input
                  {...register('cpf', {
                    required: t(
                      'account.data.cpfRequired',
                      'CPF é obrigatório para download de PDFs'
                    ),
                    validate: (value) =>
                      isValidCpf(value) ||
                      t('account.data.cpfInvalid', 'CPF inválido')
                  })}
                  className="mt-1 text-sm"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  onInput={e => {
                    const target = e.target as HTMLInputElement
                    target.value = formatCpfInput(target.value)
                  }}
                />
              ) : (
                <p className="text-sm">
                  {user.cpf ? formatCpfDisplay(user.cpf) : '—'}
                </p>
              )}
              {errors.cpf && (
                <p className="text-xs text-red-500">{errors.cpf.message}</p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t(
                  'account.data.cpfHint',
                  'Usado na marca d\'água dos PDFs baixados da biblioteca.'
                )}
              </p>
            </div>

            {/* Whatsapp */}
            <div>
              <Label className="text-xs">{t('account.data.whatsapp', 'WhatsApp')}</Label>

              {editing ? (
                <Input
                  {...register('whatsapp', {
                    required: 'Whatsapp é obrigatório'
                  })}
                  className="mt-1 text-sm"
                  // formata enquanto digita:
                  onInput={e => {
                    const target = e.target as HTMLInputElement
                    target.value = formatPhone(target.value)
                  }}
                />
              ) : (
                // exibe já formatado
                <p className="text-sm">{formatPhone(user.whatsapp!)}</p>
              )}

              {errors.whatsapp && (
                <p className="text-xs text-red-500">
                  {errors.whatsapp.message}
                </p>
              )}
            </div>

            {/* Salvar */}
            {editing && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {t('account.data.save', 'Salvar')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planos & Preços */}
        <Card
          className={`shadow-sm ${
            !hasPremium ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-medium">
              {t('account.subscription.plansPrices', 'Planos & Preços')}
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-4">
            {hasPremium && renewDate && (
              <div className="flex justify-between text-sm">
                <span>
                  {isCanceledWithGrace || isCancelling
                    ? t('account.subscription.accessUntilDate', 'Acesso até:')
                    : t('account.subscription.renewalDate', 'Data de Renovação:')}
                </span>
                <span className="font-bold">{formatDate(renewDate)}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!hasPremium}
              >
                <Link href="/account/payments-history">
                  {t('account.subscription.viewPaymentHistory', 'Ver Histórico de Pagamentos')}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={!isActiveStripe || isCancelling || isCanceledWithGrace}
                className="w-full text-red-700"
              >
                {isCancelling ? t('account.subscription.cancelSuccess', 'Cancelamento agendado!') : t('account.subscription.cancel', 'Cancelar assinatura')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Consultar especialista
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
        </Button> */}

        <Separator />

        {/* Suporte WhatsApp */}
        <Button
          size="sm"
          className="w-full bg-green-500 text-white hover:bg-green-600"
          onClick={() => window.open('https://wa.me/+5555997230707', '_blank')}
        >
          <FaWhatsapp />
          {t('account.support.whatsapp', 'Suporte via WhatsApp')}
        </Button>

        {/* Logout */}
        <Button
          size="sm"
          className="w-full bg-red-100 text-red-700 hover:bg-red-200"
          onClick={handleLogout}
        >
          {t('navbar.logout', 'Sair')}
        </Button>
      </div>

      {/* Dialog de visualização do avatar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="m-0 max-h-[100dvh] max-w-[100vw] border-0 bg-black/90 p-0">
          <div className="relative flex h-[100dvh] w-full items-center justify-center">
            <Image
              src={user.image!}
              alt="Avatar full"
              fill
              sizes="100vw"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
