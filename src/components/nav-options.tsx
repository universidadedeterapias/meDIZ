'use client'
import { Headphones, Library, LogOut, type LucideIcon } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { IconType } from 'react-icons/lib'
import { useTranslation } from '@/i18n/useTranslation'
import { useLanguage } from '@/i18n/useLanguage'
import { getUpgradeLink } from '@/lib/upgradeLinks'

type SubscriptionAPI = {
  status: string
  currentPeriodEnd: string | null
  /** Fonte de verdade do servidor (cancelado com período vigente = true) */
  hasPremiumAccess?: boolean
}

type NavOption = {
  name: string
  translationKey?: string
  url: string
  icon: LucideIcon | IconType
}

interface NavOptionsProps {
  options: readonly NavOption[]
}

const navLinkClass =
  'flex items-center gap-4 text-lg text-sidebar-foreground w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 [&_svg]:text-sidebar-foreground'

const newFeatureBadgeClass =
  'shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-md animate-pulse'

export function NavOptions({ options }: NavOptionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const [subscription, setSubscription] = useState<SubscriptionAPI | null>(null)
  const { t } = useTranslation()
  const { language } = useLanguage()

  // Carrega status da assinatura
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/stripe/subscription')
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setSubscription)
      .catch(() =>
        setSubscription({
          status: 'canceled',
          currentPeriodEnd: null,
          hasPremiumAccess: false
        })
      )
  }, [user?.id])

  const legacyPremiumHint =
    subscription?.hasPremiumAccess === undefined &&
    subscription?.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date() &&
    [
      'active',
      'trialing',
      'cancel_at_period_end',
      'past_due',
      'paused',
      'canceled',
      'cancelled'
    ].includes((subscription?.status ?? '').toLowerCase())

  const isSubscribed =
    subscription?.hasPremiumAccess === true || legacyPremiumHint

  const handleLogout = async () => {
    // Limpar todos os caches ANTES do logout
    const { clearAllCaches } = await import('@/lib/logout-utils')
    clearAllCaches()
    
    // Fazer logout
    await signOut({ redirect: false })
    
    // Forçar refresh completo da página para limpar cache do Next.js
    router.refresh()
    
    // Redirecionar para login
    router.push('/login')
    
    // Forçar reload completo da página após um pequeno delay
    // Isso garante que todos os caches sejam limpos
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }

  return (
    <SidebarGroup className="group">
      <SidebarMenu className="gap-1 pt-4">
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={
              pathname === '/audioterapia' ||
              pathname.startsWith('/audioterapia/')
            }
            tooltip={t('sidebar.audioterapia', 'Audioterapia')}
            className="px-4 py-6 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
          >
            <Link href="/audioterapia" className={navLinkClass}>
              <Headphones
                style={{ width: 24, height: 24 }}
                className="shrink-0 text-violet-600 dark:text-violet-400"
                strokeWidth={1.5}
              />
              <span className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
                <span className="truncate">
                  {t('sidebar.audioterapia', 'Audioterapia')}
                </span>
                <span className={newFeatureBadgeClass}>
                  {t('badge.new', 'NOVO')}
                </span>
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === '/biblioteca'}
            tooltip={t('sidebar.library', 'Biblioteca')}
            className="px-4 py-6 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
          >
            <Link href="/biblioteca" className={navLinkClass}>
              <Library
                style={{ width: 24, height: 24 }}
                className="shrink-0 text-indigo-600 dark:text-indigo-400"
                strokeWidth={1.5}
              />
              <span className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
                <span className="truncate">
                  {t('sidebar.library', 'Biblioteca')}
                </span>
                <span className={newFeatureBadgeClass}>
                  {t('badge.new', 'NOVO')}
                </span>
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {options.map((item, idx) => {
          // Opção premium em destaque e só se não for assinante
          const label = item.translationKey
            ? t(item.translationKey, item.name)
            : t(item.name, item.name)
          
          // Para a primeira opção (assinatura), usar link baseado no idioma
          const itemUrl = idx === 0 ? getUpgradeLink(language) : item.url

          if (idx === 0 && !isSubscribed) {
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  className="rounded-lg border border-yellow-300 border-l-4 bg-yellow-100 px-4 py-6 dark:border-yellow-700 dark:bg-yellow-950/40"
                >
                  <a
                    href={itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${navLinkClass} font-semibold text-yellow-900 dark:text-yellow-200`}
                  >
                    <item.icon
                      style={{ width: 24, height: 24 }}
                      className="text-yellow-800 dark:text-yellow-300"
                      strokeWidth="1"
                      fill="yellow"
                    />
                    {label}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // Pula a opção premium se já for assinante
          if (idx === 0 && isSubscribed) {
            return null
          }

          // Itens normais (idx > 0)
          const isExternal = idx !== options.length - 1
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild className="px-4 py-6">
                <a
                  href={itemUrl}
                  className={navLinkClass}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <item.icon style={{ width: 24, height: 24 }} />
                  {label}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}

        {/* Logout */}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="px-4 py-6">
            <Button
              variant="link"
              onClick={handleLogout}
              className="flex w-full items-center justify-start gap-4 pl-4 text-base font-normal text-sidebar-foreground"
            >
              <LogOut style={{ width: 24, height: 24 }} className="shrink-0" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {t('navbar.logout', 'Sair')}
              </span>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
