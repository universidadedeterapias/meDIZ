'use client'

import {
  Activity,
  BarChart3,
  FileText,
  GraduationCap,
  Headphones,
  Library,
  LogOut,
  PlaySquare,
  Search,
  Star,
  type LucideIcon
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'

import { UpgradeModal } from '@/components/UpgradeModal'
import { NavFolders } from '@/components/nav-folders'
import { SidebarNavSection } from '@/components/sidebar/SidebarNavSection'
import { Button } from '@/components/ui/button'
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

const navLinkClass =
  'flex items-center gap-2 text-sm font-normal text-sidebar-foreground w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 [&_svg]:size-4 [&_svg]:shrink-0'

const navItemButtonClass =
  'h-9 px-2 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground'

const newFeatureBadgeClass =
  'shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white'

type NavItemProps = {
  href: string
  label: string
  icon: LucideIcon
  isActive?: boolean
  iconClassName?: string
  showNewBadge?: boolean
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
  external,
  onClick
}: NavItemProps) {
  const content = (
    <>
      <Icon
        className={cn('size-4 shrink-0', iconClassName ?? 'text-sidebar-foreground')}
        strokeWidth={1.5}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
        <span className="truncate">{label}</span>
        {showNewBadge ? (
          <span className={newFeatureBadgeClass}>NOVO</span>
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
  onSelectSymptom
}: {
  onSelectSymptom?: (symptom: string) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
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
      <SidebarNavSection title={t('sidebar.section.search', 'Pesquisar')}>
        <SidebarMenu className="gap-0.5">
          <NavItem
            href="/chat"
            label={t('sidebar.search', 'Pesquisar')}
            icon={Search}
            isActive={pathname === '/chat' || pathname.startsWith('/chat/')}
            iconClassName="text-violet-600 dark:text-violet-400"
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
                className="mx-2 mb-1 h-9 rounded-lg border border-yellow-300 border-l-4 bg-yellow-50 px-2 dark:border-yellow-700 dark:bg-yellow-950/40"
              >
                <a
                  href={getUpgradeLink(language)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${navLinkClass} font-semibold text-yellow-900 dark:text-yellow-200`}
                >
                  <Star
                    className="size-4 text-yellow-700 dark:text-yellow-300"
                    strokeWidth={1.5}
                  />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t('sidebar.subscriptionPlus', 'Assinatura Plus')}
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}

          <NavItem
            href="/simulador"
            label={t('sidebar.simulador', 'Simulador')}
            icon={BarChart3}
            isActive={
              pathname === '/simulador' ||
              pathname.startsWith('/simulador/')
            }
            showNewBadge
            onClick={(event) => handlePremiumNav(event, '/simulador')}
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
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-9 px-2"
              tooltip={t('sidebar.supportWhatsapp', 'Suporte (WhatsApp)')}
            >
              <a
                href="https://wa.me/5555997230707?text=Ol%C3%A1!%0AEstou%20no%20app%20_me_*DIZ!*%20e%20preciso%20de%20ajuda"
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass}
              >
                <FaWhatsapp size={16} className="shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {t('sidebar.supportWhatsapp', 'Suporte (WhatsApp)')}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <NavItem
            href="https://universidadedeterapias.com.br/termos-de-uso"
            label={t('sidebar.termsPolicies', 'Termos e Políticas')}
            icon={FileText}
            external
          />
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 px-2">
              <Button
                variant="link"
                onClick={() => void handleLogout()}
                className="flex h-auto w-full items-center justify-start gap-2 p-0 text-sm font-normal text-sidebar-foreground"
              >
                <LogOut className="size-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {t('navbar.logout', 'Sair')}
                </span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarNavSection>

      <p className="px-4 pb-4 pt-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        meDIZ v0.1.0
      </p>

      <UpgradeModal
        open={openUpgradeModal}
        onOpenChange={setOpenUpgradeModal}
      />
    </>
  )
}
