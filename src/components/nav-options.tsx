'use client'

import {
  Activity,
  FileText,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Headphones,
  History,
  Home,
  Library,
  LogOut,
  MessageSquarePlus,
  PawPrint,
  PlaySquare,
  Star,
  UserRound
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'

import { UpgradeModal } from '@/components/UpgradeModal'
import { NavFolders } from '@/components/nav-folders'
import { SidebarNavSection } from '@/components/sidebar/SidebarNavSection'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { useTranslation } from '@/i18n/useTranslation'
import { useLanguage } from '@/i18n/useLanguage'
import { getUpgradeLink } from '@/lib/upgradeLinks'
import { cn } from '@/lib/utils'
import type { MedizAgent } from '@/lib/conversational-chat/config'

const navLinkClass =
  'flex w-full items-center gap-2.5 text-[13px] font-medium leading-5 text-zinc-700 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 dark:text-zinc-200'

const navItemButtonClass =
  'h-9 rounded-xl px-2.5 transition-all duration-200 hover:bg-white/40 hover:shadow-sm hover:shadow-violet-950/5 data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-500/20 data-[active=true]:via-purple-500/[0.15] data-[active=true]:to-fuchsia-500/[0.15] data-[active=true]:font-semibold data-[active=true]:text-violet-900 data-[active=true]:shadow-sm data-[active=true]:shadow-violet-500/10 dark:hover:bg-white/[0.07] dark:data-[active=true]:text-violet-100 group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-2'

const newFeatureBadgeClass =
  'shrink-0 rounded-full bg-emerald-500/[0.15] px-1.5 py-0.5 text-[9px] font-bold leading-none text-emerald-700 dark:bg-emerald-400/[0.15] dark:text-emerald-300'

type NavItemProps = {
  href: string
  label: string
  icon: React.ElementType
  isActive?: boolean
  iconClassName?: string
  showNewBadge?: boolean
  badgeLabel?: string
  external?: boolean
  onClick?: (event: React.MouseEvent) => void
}

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  iconClassName,
  showNewBadge,
  badgeLabel,
  external,
  onClick
}: NavItemProps) {
  const content = (
    <>
      <span className="flex size-5 shrink-0 items-center justify-center">
        <Icon
          className={cn(
            'size-[18px] shrink-0 transition-colors',
            isActive ? 'text-violet-700 dark:text-violet-200' : iconClassName ?? 'text-zinc-600 dark:text-zinc-300'
          )}
        />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
        <span className="truncate">{label}</span>
        {showNewBadge || badgeLabel ? (
          <span
            className={cn(
              newFeatureBadgeClass,
              badgeLabel && 'bg-amber-500/15 text-amber-700 ring-amber-500/20 dark:bg-amber-400/15 dark:text-amber-300'
            )}
          >
            {badgeLabel ?? 'NOVO'}
          </span>
        ) : null}
      </span>
    </>
  )

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className={navItemButtonClass}
      >
        {onClick ? (
          <button type="button" className={navLinkClass} onClick={onClick}>
            {content}
          </button>
        ) : external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClass}
          >
            {content}
          </a>
        ) : (
          <Link href={href} className={navLinkClass}>
            {content}
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function NavOptions({
  onSelectSymptom,
  onNewChat,
  onStartAgentChat
}: {
  onSelectSymptom?: (symptom: string) => void
  onNewChat?: () => void
  onStartAgentChat?: (agent: MedizAgent) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { isPremium, isLoading: isLoadingPremium } = useSubscriptionStatus()
  const [openUpgradeModal, setOpenUpgradeModal] = useState(false)

  const handlePremiumNav = (
    event: React.MouseEvent,
    href: string
  ) => {
    if (!isPremium && !isLoadingPremium) {
      event.preventDefault()
      setOpenUpgradeModal(true)
      return
    }
    router.push(href)
  }

  const handleLogout = async () => {
    const { clearAllCaches } = await import('@/lib/logout-utils')
    clearAllCaches()
    await signOut({ redirect: false })
    router.refresh()
    router.push('/login')
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }

  return (
    <>
      <SidebarNavSection title={t('sidebar.section.chat', 'Chat')}>
        <SidebarMenu className="gap-0.5">
          <NavItem
            href="/chat"
            label={t('sidebar.newChat', 'Novo chat')}
            icon={MessageSquarePlus}
            isActive={pathname === '/chat' && !searchParams.get('start')}
            iconClassName="text-violet-600 dark:text-violet-400"
            onClick={
              onNewChat
                ? (event) => {
                    event.preventDefault()
                    onNewChat()
                  }
                : undefined
            }
          />
          <NavItem
            href="/chat?start=body"
            label={t('chat.home.agent.body.title', 'Meu corpo')}
            icon={HeartPulse}
            isActive={pathname === '/chat' && searchParams.get('start') === 'body'}
            iconClassName="text-violet-600 dark:text-violet-400"
            onClick={
              onStartAgentChat
                ? (event) => {
                    event.preventDefault()
                    onStartAgentChat('body')
                  }
                : undefined
            }
          />
          <NavItem
            href="/chat?start=home"
            label={t('chat.home.agent.home.title', 'Minha casa')}
            icon={Home}
            isActive={pathname === '/chat' && searchParams.get('start') === 'home'}
            iconClassName="text-sky-600 dark:text-sky-400"
            onClick={
              onStartAgentChat
                ? (event) => {
                    event.preventDefault()
                    onStartAgentChat('home')
                  }
                : undefined
            }
          />
          <NavItem
            href="/chat?start=pet"
            label={t('chat.home.agent.pet.title', 'Meu pet')}
            icon={PawPrint}
            isActive={pathname === '/chat' && searchParams.get('start') === 'pet'}
            iconClassName="text-amber-600 dark:text-amber-400"
            onClick={
              onStartAgentChat
                ? (event) => {
                    event.preventDefault()
                    onStartAgentChat('pet')
                  }
                : undefined
            }
          />
          <NavItem
            href="/chat/history"
            label={t('sidebar.chatHistory', 'Histórico')}
            icon={History}
            isActive={pathname === '/chat/history'}
            iconClassName="text-zinc-600 dark:text-zinc-300"
          />
        </SidebarMenu>
      </SidebarNavSection>

      <SidebarNavSection
        title={t('sidebar.section.premium', 'Acesso Premium')}
      >
        <SidebarMenu className="gap-0.5">
          {!isPremium && !isLoadingPremium ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="mx-0.5 mb-1 h-9 rounded-xl bg-gradient-to-r from-amber-100/80 via-yellow-50/75 to-orange-100/65 px-2.5 text-amber-950 shadow-sm shadow-amber-900/10 transition-colors hover:from-amber-100 dark:from-amber-500/15 dark:via-yellow-500/10 dark:to-orange-500/10 dark:text-amber-100"
              >
                <a
                  href={getUpgradeLink(language)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${navLinkClass} font-semibold text-yellow-900 dark:text-yellow-200`}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <Star className="size-[18px] text-amber-700 dark:text-amber-300" />
                  </span>
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t('sidebar.subscriptionPlus', 'Assinatura Plus')}
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}

          <NavItem
            href="/simulador/chat?mode=experiencia"
            label={t('sidebar.simulateTherapy', 'Simular terapia')}
            icon={HeartHandshake}
            isActive={
              pathname === '/simulador/chat' &&
              searchParams.get('mode') === 'experiencia'
            }
            iconClassName="text-emerald-600 dark:text-emerald-400"
          />
          <NavItem
            href="/simulador/chat?mode=terapeuta"
            label={t('sidebar.simulateService', 'Simular atendimento')}
            icon={UserRound}
            isActive={
              pathname === '/simulador/chat' &&
              searchParams.get('mode') === 'terapeuta'
            }
            iconClassName="text-blue-600 dark:text-blue-400"
          />
          <NavItem
            href="/prof"
            label={t('sidebar.prof', 'PROF')}
            icon={GraduationCap}
            isActive={pathname === '/prof' || pathname.startsWith('/prof/')}
            showNewBadge
            onClick={(event) => handlePremiumNav(event, '/prof')}
          />
        </SidebarMenu>
      </SidebarNavSection>

      <SidebarNavSection title={t('sidebar.section.collection', 'Meu Acervo')}>
        <SidebarMenu className="gap-0.5">
          <NavItem
            href="/biblioteca"
            label={t('sidebar.library', 'Biblioteca')}
            icon={Library}
            isActive={
              pathname === '/biblioteca' || pathname.startsWith('/biblioteca/')
            }
            iconClassName="text-indigo-600 dark:text-indigo-400"
            showNewBadge
          />
          <NavItem
            href="/audioterapia"
            label={t('sidebar.audioterapias', 'Audioterapias')}
            icon={Headphones}
            isActive={
              pathname === '/audioterapia' ||
              pathname.startsWith('/audioterapia/')
            }
            iconClassName="text-violet-600 dark:text-violet-400"
            showNewBadge
          />
          <NavItem
            href="/cursos"
            label={t('sidebar.cursos', 'Cursos')}
            icon={PlaySquare}
            isActive={
              pathname === '/cursos' || pathname.startsWith('/cursos/')
            }
            iconClassName="text-indigo-600 dark:text-indigo-400"
            showNewBadge
          />
        </SidebarMenu>
      </SidebarNavSection>

      <SidebarNavSection
        title={t('sidebar.section.organization', 'Organização')}
      >
        <NavFolders embedded onSelectSymptom={onSelectSymptom} />
        <SidebarMenu className="gap-0.5">
          <NavItem
            href="/symptoms-dashboard"
            label={t(
              'dashboard.symptoms.title',
              'Dashboard de Sintomas'
            )}
            icon={Activity}
            isActive={pathname === '/symptoms-dashboard'}
            iconClassName="text-indigo-600 dark:text-indigo-400"
            onClick={(event) => handlePremiumNav(event, '/symptoms-dashboard')}
          />
        </SidebarMenu>
      </SidebarNavSection>

      <SidebarNavSection title={t('sidebar.section.support', 'Suporte e Conta')}>
        <SidebarMenu className="gap-0.5">
          <NavItem
            href="https://wa.me/5555997230707?text=Ol%C3%A1!%0AEstou%20no%20app%20_me_*DIZ!*%20e%20preciso%20de%20ajuda"
            label={t('sidebar.supportWhatsapp', 'Suporte (WhatsApp)')}
            icon={FaWhatsapp}
            iconClassName="text-emerald-600 dark:text-emerald-400"
            external
          />
          <NavItem
            href="https://universidadedeterapias.com.br/termos-de-uso"
            label={t('sidebar.termsPolicies', 'Termos e Políticas')}
            icon={FileText}
            external
          />
          <NavItem
            href="/login"
            label={t('navbar.logout', 'Sair')}
            icon={LogOut}
            iconClassName="text-zinc-600 dark:text-zinc-300"
            onClick={() => void handleLogout()}
          />
        </SidebarMenu>
      </SidebarNavSection>

      <UpgradeModal
        open={openUpgradeModal}
        onOpenChange={setOpenUpgradeModal}
      />
    </>
  )
}
